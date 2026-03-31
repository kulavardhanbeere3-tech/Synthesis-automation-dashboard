module fulladder (A,B,C,Sum,Carry,Clock, Scan_clk,Scan_en,cg_en, gen_clk_mux );

input A,B,C,Clock,Scan_clk,Scan_en,cg_en, gen_clk_mux;
output Sum,Carry;

wire  n4, n5, n6, n7, n8, n9, n10, n11, n12, n13, n14, n15, CLK, mux_clock,gated_clock;

/*************************************************************************/
// Full Adder Structural Code using cells from OpenRoad's nangate45 lib 
/*************************************************************************/

//clock Path - Clock - > CLK
//CKMUX2SGD1BWP30P140 mux1(.I0(Clock), .I1(Scan_clk), .S(Scan_en), .Z(mux_clock));
MUX2_X1 mux1(.A(Clock), .B(Scan_clk), .S(Scan_en), .Z(mux_clock));

//AN2SGD0BWP30P140 gate(.A1(mux_clock), .A2(cg_en), .Z(gated_clock));
AND2_X1 gate(.A1(mux_clock), .A2(cg_en), .ZN(gated_clock));

//BUFFSGD3BWP30P140HVT CLK_B1 (.I(gated_clock), .Z(CLK) );
BUF_X1 CLK_B1 (.A(gated_clock), .Z(CLK) );

//SDFQOPPSBSGD1BWP30P140HVT reg1(.D(A), .CP(CLK), .Q(n4), .SI(1'b0), .SE(1'b0));
//SDFQOPPSBSGD1BWP30P140HVT reg2(.D(B), .CP(CLK), .Q(n5), .SI(1'b0), .SE(1'b0));
//SDFQOPPSBSGD1BWP30P140HVT reg3(.D(C), .CP(CLK), .Q(n6), .SI(1'b0), .SE(1'b0));
DFF_X1 reg1(.D(A), .CK(CLK), .Q(n4), .QN() );
DFF_X1 reg2(.D(B), .CK(CLK), .Q(n5), .QN() );
DFF_X1 reg3(.D(C), .CK(CLK), .Q(n6), .QN() );


//XOR2SGD0BWP30P140 G1(.A1(n4), .A2(n5), .Z(n7));
//XOR2SGD0BWP30P140 G2(.A1(n7), .A2(n6), .Z(n8));
XOR2_X1 G1(.A(n4), .B(n5), .Z(n7));
XOR2_X1 G2(.A(n7), .B(n6), .Z(n8));


//AN2SGD0BWP30P140 G3(.A1(n5), .A2(n6), .Z(n9));
//AN2SGD0BWP30P140 G4(.A1(n4), .A2(n5), .Z(n10));
//AN2SGD0BWP30P140 G5(.A1(n4), .A2(n6), .Z(n11));
AND2_X1 G3(.A1(n5), .A2(n6), .ZN(n9));
AND2_X1 G4(.A1(n4), .A2(n5), .ZN(n10));
AND2_X1 G5(.A1(n4), .A2(n6), .ZN(n11));

//OR2SGD1BWP30P140 G7(.A1(n9), .A2(n10), .Z(n12));
//OR2SGD1BWP30P140 G6(.A1(n12), .A2(n11), .Z(n13));
OR2_X1 G7(.A1(n9), .A2(n10), .ZN(n12));
OR2_X1 G6(.A1(n12), .A2(n11), .ZN(n13));

//SDFQOPPSBSGD1BWP30P140HVT reg4(.D(n13), .CP(CLK), .Q(n14), .SI(1'b0), .SE(1'b0));
//SDFQOPPSBSGD1BWP30P140HVT reg5(.D(n8), .CP(CLK), .Q(n15), .SI(1'b0), .SE(1'b0));
DFF_X1 reg4(.D(n13), .CK(CLK), .Q(n14), .QN() );
DFF_X1 reg5(.D(n8),  .CK(CLK), .Q(n15), .QN() );

//BUFFSGD3BWP30P140HVT B1 (.I(n14), .Z(Carry) );
//BUFFSGD3BWP30P140HVT B2 (.I(n15), .Z(Sum) );
BUF_X1 B1 (.A(n14), .Z(Carry) );
BUF_X1 B2 (.A(n15), .Z(Sum) );

endmodule


