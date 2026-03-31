module full_adder_simple (
    input wire A, B, C,
    output wire Sum, Carry
);

    // Simple combinational full adder
    assign Sum = A ^ B ^ C;
    assign Carry = (A & B) | (A & C) | (B & C);

endmodule 