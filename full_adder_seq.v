module full_adder_seq (
    input wire A, B, C,
    input wire clk,
    output reg Sum, Carry
);

    // Internal wires for combinational logic
    wire sum_comb, carry_comb;

    // Combinational logic
    assign sum_comb = A ^ B ^ C;
    assign carry_comb = (A & B) | (A & C) | (B & C);

    // Sequential outputs
    always @(posedge clk) begin
        Sum <= sum_comb;
        Carry <= carry_comb;
    end

endmodule 