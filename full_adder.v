module full_adder (
    input wire A, B, C,
    input wire Clock, Scan_clk, Scan_en,
    input wire cg_en, gen_clk_mux,
    output wire Sum, Carry
);

    // Internal wires
    wire mux_clock;
    wire gated_clock;
    wire CLK;

    wire n4, n5, n6;  // DFF outputs for A, B, C
    wire n7, n8;      // XOR outputs
    wire n9, n10, n11, n12, n13; // Carry gen
    wire n14, n15;    // Final registered outputs

    // === Clock Mux ===
    assign mux_clock = (Scan_en) ? Scan_clk : Clock;

    // === Clock Gating ===
    assign gated_clock = mux_clock & cg_en;

    // === Clock Buffer ===
    assign CLK = gated_clock;

    // === Register Inputs ===
    reg reg_a, reg_b, reg_c;
    always @(posedge CLK)
        reg_a <= A;
    always @(posedge CLK)
        reg_b <= B;
    always @(posedge CLK)
        reg_c <= C;

    assign n4 = reg_a;
    assign n5 = reg_b;
    assign n6 = reg_c;

    // === Combinational Logic ===
    assign n7 = n4 ^ n5;
    assign n8 = n7 ^ n6;

    assign n9  = n5 & n6;
    assign n10 = n4 & n5;
    assign n11 = n4 & n6;
    assign n12 = n9 | n10;
    assign n13 = n12 | n11;

    // === Output Registers ===
    reg reg_sum, reg_carry;
    always @(posedge CLK)
        reg_sum <= n8;
    always @(posedge CLK)
        reg_carry <= n13;

    assign Sum   = reg_sum;
    assign Carry = reg_carry;

endmodule
