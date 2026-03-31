from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import VerilogFile, Netlist
from .serializers import VerilogFileSerializer, NetlistSerializer
from django.shortcuts import get_object_or_404
import subprocess
from pathlib import Path
from rest_framework.generics import ListAPIView, DestroyAPIView
from django.http import HttpResponse
from django.conf import settings
import os
from .models import LibraryFile
from .serializers import LibraryFileSerializer
from rest_framework.generics import DestroyAPIView

# Create your views here.

class TestView(APIView):
    def get(self, request, format=None):
        return Response({"message": "Test endpoint working", "status": "ok"})

class VerilogFileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        serializer = VerilogFileSerializer(data=request.data)
        if serializer.is_valid():
            instance = serializer.save()
            # Save the original filename
            if 'file' in request.FILES:
                instance.original_name = request.FILES['file'].name
                instance.save()
            return Response(VerilogFileSerializer(instance).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class YosysSynthesisView(APIView):
    def post(self, request, pk, format=None):
        verilog_file = get_object_or_404(VerilogFile, pk=pk)
        file_path = verilog_file.file.path
        file_dir = str(Path(file_path).parent.resolve())
        file_name = Path(file_path).name
        top_module = request.data.get('top_module') or os.path.splitext(file_name)[0]

        # Output directories
        output_dir = os.path.join(file_dir, f"synth_{verilog_file.id}_out")
        timing_dir = os.path.join(output_dir, "timing_reports")
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(timing_dir, exist_ok=True)

        # Optional library
        library_id = request.data.get('library_id')
        liberty_path = ""
        if library_id:
            library_file = get_object_or_404(LibraryFile, pk=library_id)
            liberty_path = f"/lib/{Path(library_file.file.path).name}"
            lib_dir = str(Path(library_file.file.path).parent.resolve())
        else:
            lib_dir = None

        # Write the TCL script
        tcl_script_path = os.path.join(file_dir, "synth.tcl")
        with open(tcl_script_path, "w") as f:
            liberty = liberty_path or "/data/NangateOpenCellLibrary_typical.lib"
            f.write(f"""\
log /out/1_1_yosys.log

read_verilog "/data/{file_name}"
read_liberty -lib "{liberty}"
abc -liberty "{liberty}"
hierarchy -check -top {top_module}

# Process sequential logic properly
proc
opt_clean -purge

# Basic optimization for complex designs
opt -purge
write_rtlil /out/1_synth.rtlil

design -reset

read_rtlil /out/1_synth.rtlil
read_liberty -lib "{liberty}"
abc -liberty "{liberty}"
hierarchy -check -top {top_module}

# Process sequential logic again
proc
opt_clean -purge

# Additional optimization for complex designs
opt -purge

synth -top {top_module} -run :fine
json -o /out/mem.json
chformal -remove
opt -purge
techmap
opt -fast -purge
dfflibmap -liberty "{liberty}"
opt
setundef -zero
splitnets
opt_clean -purge
tee -o /out/timing_reports/synth_check.txt check
tee -o /out/timing_reports/synth_stat.txt stat
write_verilog -noexpr -nohex -nodec /out/1_1_yosys.v

log Synthesis completed successfully
""")


        # Build Docker command
        docker_cmd = [
            "docker", "run", "--rm",
            "-v", f"{file_dir}:/data",
            "-v", f"{output_dir}:/out",
        ]
        if lib_dir:
            docker_cmd += ["-v", f"{lib_dir}:/lib"]
        docker_cmd += [
            "yosyshq/yosys:latest",
            "yosys", "-s", f"/data/synth.tcl"
        ]

        # Run Yosys in Docker
        print("Docker command:", " ".join(docker_cmd))
        print("Yosys script:")
        with open(tcl_script_path) as f:
            print(f.read())
        
        # Check if Docker is available
        try:
            docker_check = subprocess.run(["docker", "--version"], capture_output=True, text=True)
            if docker_check.returncode != 0:
                raise Exception("Docker is not available or not running")
            print("Docker is available")
        except Exception as e:
            raise Exception(f"Docker check failed: {e}")
        
        # Check if Yosys image exists, pull if not
        yosys_images = ["yosyshq/yosys:latest", "hdlc/yosys", "yosys/yosys:latest"]
        yosys_image = None
        use_docker = True
        
        for image in yosys_images:
            try:
                print(f"Checking for Yosys image: {image}")
                image_check = subprocess.run(["docker", "image", "inspect", image], capture_output=True, text=True)
                if image_check.returncode == 0:
                    yosys_image = image
                    print(f"Found Yosys image: {image}")
                    break
                else:
                    print(f"Image {image} not found, trying to pull...")
                    pull_result = subprocess.run(["docker", "pull", image], capture_output=True, text=True, timeout=60)
                    if pull_result.returncode == 0:
                        yosys_image = image
                        print(f"Successfully pulled Yosys image: {image}")
                        break
                    else:
                        print(f"Failed to pull {image}: {pull_result.stderr}")
            except subprocess.TimeoutExpired:
                print(f"Timeout pulling {image}")
                continue
            except Exception as e:
                print(f"Error checking/pulling {image}: {e}")
                continue
        
        if yosys_image is None:
            print("No Docker Yosys image available, trying local Yosys installation...")
            # Try local Yosys installation
            try:
                yosys_check = subprocess.run(["yosys", "--version"], capture_output=True, text=True)
                if yosys_check.returncode == 0:
                    use_docker = False
                    print("Found local Yosys installation")
                else:
                    raise Exception("Local Yosys not found")
            except Exception as e:
                raise Exception(f"No Yosys available. Docker images failed and local Yosys not found. Error: {e}")
        
        # Build command (Docker or local)
        if use_docker:
            docker_cmd = [
                "docker", "run", "--rm",
                "-v", f"{file_dir}:/data",
                "-v", f"{output_dir}:/out",
            ]
            if lib_dir:
                docker_cmd += ["-v", f"{lib_dir}:/lib"]
            docker_cmd += [
                yosys_image,
                "yosys", "-s", f"/data/synth.tcl"
            ]
        else:
            # Use local Yosys
            docker_cmd = ["yosys", "-s", tcl_script_path]
            print("Using local Yosys installation")
            
        result = subprocess.run(docker_cmd, capture_output=True, text=True)

        # Try to read the synthesized file output
        synth_out_path = os.path.join(output_dir, "1_1_yosys.v")
        synth_content = None
        if os.path.exists(synth_out_path):
            with open(synth_out_path, 'r') as f:
                synth_content = f.read()
        return Response({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "synthesized_file": synth_out_path if synth_content else None,
            "synthesized_content": synth_content
        })

class VerilogFileListView(ListAPIView):
    queryset = VerilogFile.objects.all().order_by('-uploaded_at')
    serializer_class = VerilogFileSerializer

class VerilogFileContentView(APIView):
    def get(self, request, pk, format=None):
        verilog_file = get_object_or_404(VerilogFile, pk=pk)
        try:
            with open(verilog_file.file.path, 'r') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/plain')
        except Exception as e:
            return HttpResponse('Failed to load file content.', status=500)

class NetlistGenerateView(APIView):
    def post(self, request, pk, format=None):
        try:
            print("NetlistGenerateView: Starting request")
            print(f"Request data: {request.data}")
            print(f"PK: {pk}")
            
            verilog_file = get_object_or_404(VerilogFile, pk=pk)
            print(f"Found verilog file: {verilog_file.file.path}")
            
            file_path = verilog_file.file.path
            file_dir = str(Path(file_path).parent.resolve())
            file_name = Path(file_path).name
            top_module = request.data.get('top_module') or os.path.splitext(file_name)[0]

            print(f"Starting netlist generation for file: {file_path}")
            print(f"Top module: {top_module}")

            # Output directories
            output_dir = os.path.join(file_dir, f"netlist_{verilog_file.id}_out")
            timing_dir = os.path.join(output_dir, "timing_reports")
            os.makedirs(output_dir, exist_ok=True)
            os.makedirs(timing_dir, exist_ok=True)

            print(f"Output directory: {output_dir}")

            # Optional library
            library_id = request.data.get('library_id')
            liberty_path = ""
            if library_id:
                library_file = get_object_or_404(LibraryFile, pk=library_id)
                liberty_path = f"/lib/{Path(library_file.file.path).name}"
                lib_dir = str(Path(library_file.file.path).parent.resolve())
                print(f"Using library: {library_file.file.path}")
            else:
                lib_dir = None
                print("Using default library")

            # Write the TCL script
            tcl_script_path = os.path.join(file_dir, "netlist.tcl")
            with open(tcl_script_path, "w") as f:
                liberty = liberty_path or "/data/NangateOpenCellLibrary_typical.lib"
                f.write(f"""\
log /out/1_1_yosys.log

read_verilog "/data/{file_name}"
read_liberty -lib "{liberty}"
abc -liberty "{liberty}"
hierarchy -check -top {top_module}

# Process sequential logic properly
proc
opt_clean -purge

# Basic optimization for complex designs
opt -purge
write_rtlil /out/1_synth.rtlil

design -reset

read_rtlil /out/1_synth.rtlil
read_liberty -lib "{liberty}"
abc -liberty "{liberty}"
hierarchy -check -top {top_module}

# Process sequential logic again
proc
opt_clean -purge

# Additional optimization for complex designs
opt -purge

synth -top {top_module} -run :fine
json -o /out/mem.json
chformal -remove
opt -purge
techmap
opt -fast -purge
dfflibmap -liberty "{liberty}"
opt
setundef -zero
splitnets
opt_clean -purge
tee -o /out/timing_reports/synth_check.txt check
tee -o /out/timing_reports/synth_stat.txt stat
write_verilog -noexpr -nohex -nodec /out/{top_module}.v

log Netlist generation completed successfully
""")

            print(f"TCL script written to: {tcl_script_path}")

            # Build Docker command
            docker_cmd = [
                "docker", "run", "--rm",
                "-v", f"{file_dir}:/data",
                "-v", f"{output_dir}:/out",
            ]
            if lib_dir:
                docker_cmd += ["-v", f"{lib_dir}:/lib"]
            docker_cmd += [
                "yosyshq/yosys:latest",
                "yosys", "-s", f"/data/netlist.tcl"
            ]

            # Run Yosys in Docker
            print("Docker command:", " ".join(docker_cmd))
            print("Yosys script:")
            with open(tcl_script_path) as f:
                print(f.read())
            
            # Check if Docker is available
            try:
                docker_check = subprocess.run(["docker", "--version"], capture_output=True, text=True)
                if docker_check.returncode != 0:
                    raise Exception("Docker is not available or not running")
                print("Docker is available")
            except Exception as e:
                raise Exception(f"Docker check failed: {e}")
            
            # Check if Yosys image exists, pull if not
            yosys_images = ["yosyshq/yosys:latest", "hdlc/yosys", "yosys/yosys:latest"]
            yosys_image = None
            use_docker = True
            
            for image in yosys_images:
                try:
                    print(f"Checking for Yosys image: {image}")
                    image_check = subprocess.run(["docker", "image", "inspect", image], capture_output=True, text=True)
                    if image_check.returncode == 0:
                        yosys_image = image
                        print(f"Found Yosys image: {image}")
                        break
                    else:
                        print(f"Image {image} not found, trying to pull...")
                        pull_result = subprocess.run(["docker", "pull", image], capture_output=True, text=True, timeout=60)
                        if pull_result.returncode == 0:
                            yosys_image = image
                            print(f"Successfully pulled Yosys image: {image}")
                            break
                        else:
                            print(f"Failed to pull {image}: {pull_result.stderr}")
                except subprocess.TimeoutExpired:
                    print(f"Timeout pulling {image}")
                    continue
                except Exception as e:
                    print(f"Error checking/pulling {image}: {e}")
                    continue
            
            if yosys_image is None:
                print("No Docker Yosys image available, trying local Yosys installation...")
                # Try local Yosys installation
                try:
                    yosys_check = subprocess.run(["yosys", "--version"], capture_output=True, text=True)
                    if yosys_check.returncode == 0:
                        use_docker = False
                        print("Found local Yosys installation")
                    else:
                        raise Exception("Local Yosys not found")
                except Exception as e:
                    raise Exception(f"No Yosys available. Docker images failed and local Yosys not found. Error: {e}")
            
            # Build command (Docker or local)
            if use_docker:
                docker_cmd = [
                    "docker", "run", "--rm",
                    "-v", f"{file_dir}:/data",
                    "-v", f"{output_dir}:/out",
                ]
                if lib_dir:
                    docker_cmd += ["-v", f"{lib_dir}:/lib"]
                docker_cmd += [
                    yosys_image,
                    "yosys", "-s", f"/data/netlist.tcl"
                ]
            else:
                # Use local Yosys
                docker_cmd = ["yosys", "-s", tcl_script_path]
                print("Using local Yosys installation")
                
            print(f"Running command: {' '.join(docker_cmd)}")
            result = subprocess.run(docker_cmd, capture_output=True, text=True)
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            print("Return code:", result.returncode)

            # Try to read the netlist file output
            netlist_out_path = os.path.join(output_dir, f"{top_module}.v")
            netlist_content = None
            print(f"Looking for netlist file: {netlist_out_path}")
            print(f"File exists: {os.path.exists(netlist_out_path)}")
            
            if os.path.exists(output_dir):
                print(f"Output directory contents: {os.listdir(output_dir)}")
            
            if os.path.exists(netlist_out_path):
                with open(netlist_out_path, 'r') as f:
                    netlist_content = f.read()
                print(f"Netlist content length: {len(netlist_content)}")
                
                # Save to Netlist model
                netlist_path = os.path.join(settings.MEDIA_ROOT, 'netlists', f"{top_module}.v")
                os.makedirs(os.path.dirname(netlist_path), exist_ok=True)
                with open(netlist_path, 'w') as out_f:
                    out_f.write(netlist_content)
                netlist_rel_path = os.path.relpath(netlist_path, settings.MEDIA_ROOT)
                netlist_obj = Netlist.objects.create(verilog_file=verilog_file, file=netlist_rel_path)
                serializer = NetlistSerializer(netlist_obj)
                
                return Response({
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode,
                    "netlist": serializer.data,
                    "netlist_content": netlist_content,
                    "netlist_content_name": f"{top_module}.v"
                })
            else:
                # Check for any .v files in output directory
                v_files = []
                if os.path.exists(output_dir):
                    for file in os.listdir(output_dir):
                        if file.endswith('.v'):
                            v_files.append(file)
                            print(f"Found .v file: {file}")
                
                return Response({
                    "error": f"Netlist not generated. Expected file: {top_module}.v not found. Found .v files: {v_files}",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode,
                    "output_dir": output_dir,
                    "expected_file": f"{top_module}.v",
                    "found_files": v_files
                }, status=500)
                
        except Exception as e:
            import traceback
            print(f"Netlist generation error: {e}")
            traceback.print_exc()
            return Response({
                "error": str(e),
                "traceback": traceback.format_exc()
            }, status=500)

class NetlistListView(ListAPIView):
    serializer_class = NetlistSerializer
    def get_queryset(self):
        verilog_file_id = self.kwargs['pk']
        return Netlist.objects.filter(verilog_file_id=verilog_file_id).order_by('-created_at')

class NetlistContentView(APIView):
    def get(self, request, pk, format=None):
        netlist = get_object_or_404(Netlist, pk=pk)
        try:
            with open(netlist.file.path, 'r') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/plain')
        except Exception as e:
            return HttpResponse('Failed to load netlist content.', status=500)

class NetlistDeleteView(DestroyAPIView):
    queryset = Netlist.objects.all()
    serializer_class = NetlistSerializer

class LibraryFileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        serializer = LibraryFileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LibraryFileListView(ListAPIView):
    queryset = LibraryFile.objects.all().order_by('-uploaded_at')
    serializer_class = LibraryFileSerializer

class LibraryFileContentView(APIView):
    def get(self, request, pk, format=None):
        try:
            library_file = get_object_or_404(LibraryFile, pk=pk)
            print(f"Library file found: {library_file.file.path}")
            print(f"File exists: {os.path.exists(library_file.file.path)}")
            with open(library_file.file.path, 'r') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/plain')
        except LibraryFile.DoesNotExist:
            print(f"Library file with pk={pk} not found")
            return HttpResponse('Library file not found.', status=404)
        except Exception as e:
            print(f"Error loading library content: {e}")
            return HttpResponse('Failed to load library content.', status=500)

class LibraryFileDeleteView(DestroyAPIView):
    queryset = LibraryFile.objects.all()
    serializer_class = LibraryFileSerializer

class VerilogFileDeleteView(DestroyAPIView):
    queryset = VerilogFile.objects.all()
    serializer_class = VerilogFileSerializer
