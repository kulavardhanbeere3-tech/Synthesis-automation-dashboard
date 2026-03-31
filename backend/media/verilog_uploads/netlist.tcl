log /out/1_1_yosys.log

read_verilog "/data/counter_4bit.v"
read_liberty -lib "/data/NangateOpenCellLibrary_typical.lib"
abc -liberty "/data/NangateOpenCellLibrary_typical.lib"
hierarchy -check -top counter_4bit

# Process sequential logic properly
proc
opt_clean -purge

# Basic optimization for complex designs
opt -purge
write_rtlil /out/1_synth.rtlil

design -reset

read_rtlil /out/1_synth.rtlil
read_liberty -lib "/data/NangateOpenCellLibrary_typical.lib"
abc -liberty "/data/NangateOpenCellLibrary_typical.lib"
hierarchy -check -top counter_4bit

# Process sequential logic again
proc
opt_clean -purge

# Additional optimization for complex designs
opt -purge

synth -top counter_4bit -run :fine
json -o /out/mem.json
chformal -remove
opt -purge
techmap
opt -fast -purge
dfflibmap -liberty "/data/NangateOpenCellLibrary_typical.lib"
opt
setundef -zero
splitnets
opt_clean -purge
tee -o /out/timing_reports/synth_check.txt check
tee -o /out/timing_reports/synth_stat.txt stat
write_verilog -noexpr -nohex -nodec /out/counter_4bit.v

log Netlist generation completed successfully
