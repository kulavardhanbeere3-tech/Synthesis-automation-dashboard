# Set design variables
set design_name counter_4bit
set design_files "/workspace/backend/media/verilog_uploads/counter_4bit.v"
set liberty_path "/workspace/backend/media/verilog_uploads/NangateOpenCellLibrary_typical.lib"
# Update these paths if you have these files, or comment/remove if not used
set CLKGATE_MAP_FILE "/workspace/path/to/clk_gate_map.v"
set ADDER_MAP_FILE "/workspace/path/to/adder_map.v"
set LATCH_MAP_FILE "/workspace/path/to/latch_map.v"
set abc_script "/workspace/path/to/abc.script"
set SYNTH_FULL_ARGS ""
set dfflibmap_args ""
set TIEHI_CELL_AND_PORT "TIEHI Z"
set TIELO_CELL_AND_PORT "TIELO Z"
set MIN_BUF_CELL_AND_PORTS "BUF A Y"
set stat_libs ""

# Output directories (ensure they exist)
set output_dir "/workspace/p2f_scripts/outputs/$design_name"
set timing_dir "/workspace/p2f_scripts/timing_reports/$design_name"
file mkdir $output_dir
file mkdir $timing_dir

# 1st Yosys command: Synthesis to RTLIL
log /workspace/p2f_scripts/outputs/1_1_yosys.log
read_verilog $design_files
read_liberty -lib $liberty_path
# Comment out the next line if you don't have a clock gate map file
# read_verilog -defer $CLKGATE_MAP_FILE
# Comment out the next line if you don't have an abc script
# abc -script $abc_script
hierarchy -check -top $design_name
opt_clean -purge
write_rtlil $output_dir/1_synth.rtlil

# 2nd Yosys command: Full synthesis and reporting
read_rtlil $output_dir/1_synth.rtlil
read_liberty -lib $liberty_path
# read_verilog -defer $CLKGATE_MAP_FILE
# abc -script $abc_script
hierarchy -check -top $design_name
synth -top $design_name -run :fine $SYNTH_FULL_ARGS
json -o $output_dir/mem.json
chformal -remove
opt -purge
# extract_fa
# techmap -map $ADDER_MAP_FILE
techmap
opt -fast -purge
# techmap -map $LATCH_MAP_FILE
dfflibmap -liberty $liberty_path $dfflibmap_args
opt
setundef -zero
splitnets
opt_clean -purge
# hilomap -singleton -hicell $TIEHI_CELL_AND_PORT -locell $TIELO_CELL_AND_PORT
# insbuf -buf $MIN_BUF_CELL_AND_PORTS
tee -o $timing_dir/synth_check.txt check
tee -o $timing_dir/synth_stat.txt stat $stat_libs
write_verilog -noexpr -nohex -nodec $output_dir/1_1_yosys.v
log Synthesis completed Successfully