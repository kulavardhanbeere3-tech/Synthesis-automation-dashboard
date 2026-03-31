#!/usr/bin/env python3
"""
Simple test script to verify Yosys Docker setup
"""

import subprocess
import tempfile
import os

def test_local_yosys():
    """Test local Yosys installation"""
    print("Testing local Yosys installation...")
    try:
        result = subprocess.run(["yosys", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ Local Yosys found: {result.stdout.strip()}")
            return True
        else:
            print("❌ Local Yosys not working")
            return False
    except subprocess.TimeoutExpired:
        print("❌ Local Yosys test timed out")
        return False
    except Exception as e:
        print(f"❌ Local Yosys not found: {e}")
        return False

def test_docker_yosys():
    """Test Docker Yosys setup"""
    print("Testing Docker Yosys setup...")
    
    # Create a simple test Verilog file
    test_verilog = """
module test_module (
    input wire a, b,
    output wire c
);
    assign c = a & b;
endmodule
"""
    
    # Create a simple test TCL script
    test_tcl = """
read_verilog /data/test.v
hierarchy -check -top test_module
synth -top test_module
write_verilog /out/test_out.v
"""
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Write test files
        verilog_path = os.path.join(temp_dir, "test.v")
        tcl_path = os.path.join(temp_dir, "test.tcl")
        output_dir = os.path.join(temp_dir, "out")
        os.makedirs(output_dir, exist_ok=True)
        
        with open(verilog_path, 'w') as f:
            f.write(test_verilog)
        
        with open(tcl_path, 'w') as f:
            f.write(test_tcl)
        
        # Try different Docker images
        yosys_images = ["yosyshq/yosys:latest", "hdlc/yosys", "yosys/yosys:latest"]
        
        for image in yosys_images:
            print(f"Trying Docker image: {image}")
            
            # Build Docker command
            docker_cmd = [
                "docker", "run", "--rm",
                "-v", f"{temp_dir}:/data",
                "-v", f"{output_dir}:/out",
                image,
                "yosys", "-s", "/data/test.tcl"
            ]
            
            try:
                result = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=30)
                print(f"Return code: {result.returncode}")
                
                if result.returncode == 0:
                    print("✅ Docker Yosys test successful!")
                    # Check if output file was created
                    output_file = os.path.join(output_dir, "test_out.v")
                    if os.path.exists(output_file):
                        with open(output_file, 'r') as f:
                            content = f.read()
                        print(f"Output file created: {len(content)} characters")
                        return True, image
                    else:
                        print("❌ Output file not created")
                else:
                    print(f"❌ Docker test failed for {image}")
                    print(f"STDERR: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                print(f"❌ Docker test timed out for {image}")
            except Exception as e:
                print(f"❌ Docker test error for {image}: {e}")
        
        return False, None

def test_yosys():
    print("=== Yosys Setup Test ===\n")
    
    # Test local installation first
    local_available = test_local_yosys()
    print()
    
    # Test Docker installation
    docker_available, docker_image = test_docker_yosys()
    print()
    
    # Summary
    print("=== Summary ===")
    if local_available:
        print("✅ Local Yosys: Available")
    else:
        print("❌ Local Yosys: Not available")
    
    if docker_available:
        print(f"✅ Docker Yosys: Available ({docker_image})")
    else:
        print("❌ Docker Yosys: Not available")
    
    if local_available or docker_available:
        print("\n🎉 Yosys is available and should work with the synthesis platform!")
        if local_available:
            print("💡 Using local Yosys installation")
        else:
            print(f"💡 Using Docker Yosys image: {docker_image}")
    else:
        print("\n💥 No Yosys installation found!")
        print("Please install Yosys locally or ensure Docker is working.")
        print("See YOSYS_INSTALLATION.md for installation instructions.")
    
    return local_available or docker_available

if __name__ == "__main__":
    success = test_yosys()
    if not success:
        print("\n📋 Next steps:")
        print("1. Install Yosys locally (see YOSYS_INSTALLATION.md)")
        print("2. Or ensure Docker is running and has internet access")
        print("3. Run this test again to verify the setup") 