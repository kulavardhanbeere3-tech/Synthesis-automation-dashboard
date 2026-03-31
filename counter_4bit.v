module counter_4bit (
    input wire clk,      // Clock input
    input wire rst,      // Asynchronous reset (active high)
    input wire en,       // Enable signal (counts when high)
    output reg [3:0] cnt // 4-bit counter output
);

// Counter logic
always @(posedge clk or posedge rst) begin
    if (rst) begin       // Reset condition (asynchronous)
        cnt <= 4'b0000;
    end else if (en) begin // Increment if enabled
        cnt <= cnt + 1;
    end
end

endmodule