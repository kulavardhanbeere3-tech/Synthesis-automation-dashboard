// ======== Defines =========
`define XLEN 32
`define REG_ADDR_W 5

`define OP_RTYPE  7'b0110011
`define OP_ITYPE  7'b0010011
`define OP_LOAD   7'b0000011
`define OP_STORE  7'b0100011
`define OP_BRANCH 7'b1100011

`define ALU_ADD  3'b000
`define ALU_SUB  3'b001
`define ALU_AND  3'b010
`define ALU_OR   3'b011
`define ALU_XOR  3'b100
`define ALU_SLT  3'b101

// ======== Top Module =========
module riscv_core(input wire clk, input wire reset);
    wire [`XLEN-1:0] pc, instr;
    wire [`REG_ADDR_W-1:0] rs1, rs2, rd;
    wire [`XLEN-1:0] rs1_data, rs2_data, imm;
    wire [2:0] alu_op;
    wire alu_src, reg_write, mem_read, mem_write;
    wire [`XLEN-1:0] alu_result, mem_read_data, write_data;

    // IF
    if_stage IF(.clk(clk), .reset(reset), .pc_out(pc), .instr_out(instr));
    // ID
    id_stage ID(.clk(clk), .reset(reset), .instr(instr), .rs1(rs1), .rs2(rs2), .rd(rd),
                .rs1_data(rs1_data), .rs2_data(rs2_data), .imm_out(imm),
                .alu_op(alu_op), .alu_src(alu_src), .reg_write(reg_write),
                .mem_read(mem_read), .mem_write(mem_write));
    // Register File
    reg_file RF(.clk(clk), .rs1(rs1), .rs2(rs2), .rd(rd), .rd_data(write_data),
                .reg_write(reg_write), .rs1_data(rs1_data), .rs2_data(rs2_data));
    // ALU
    alu ALU(.in1(rs1_data), .in2(alu_src ? imm : rs2_data), .alu_op(alu_op), .out(alu_result));
    // Memory
    data_mem DM(.clk(clk), .addr(alu_result), .write_data(rs2_data),
                .read_en(mem_read), .write_en(mem_write), .read_data(mem_read_data));

    assign write_data = mem_read ? mem_read_data : alu_result;
endmodule

// ======== IF Stage =========
module if_stage(input wire clk, input wire reset, output reg [31:0] pc_out, output wire [31:0] instr_out);
    reg [31:0] pc;
    wire [31:0] instr;

    instr_mem IM(.addr(pc), .data(instr));
    assign instr_out = instr;

    always @(posedge clk or posedge reset) begin
        if (reset)
            pc <= 32'b0;
        else
            pc <= pc + 4;
    end

    always @(*) begin
        pc_out = pc;
    end
endmodule

// ======== Instruction Memory =========
module instr_mem(input wire [31:0] addr, output wire [31:0] data);
    reg [31:0] memory [0:255];
    assign data = memory[addr[9:2]];

    initial begin
        // Example: add x3, x1, x2 (opcode=0x33)
        memory[0] = 32'b0000000_00010_00001_000_00011_0110011;  // add x3, x1, x2
        // Add more instructions as needed
    end
endmodule

// ======== ID Stage =========
module id_stage(
    input wire clk, input wire reset,
    input wire [31:0] instr,
    output reg [`REG_ADDR_W-1:0] rs1, rs2, rd,
    input wire [`XLEN-1:0] rs1_data, rs2_data,
    output reg [`XLEN-1:0] imm_out,
    output reg [2:0] alu_op,
    output reg alu_src, reg_write, mem_read, mem_write
);
    wire [6:0] opcode = instr[6:0];
    wire [2:0] funct3 = instr[14:12];
    wire [6:0] funct7 = instr[31:25];

    always @(*) begin
        rs1 = instr[19:15];
        rs2 = instr[24:20];
        rd = instr[11:7];
        imm_out = {{20{instr[31]}}, instr[31:20]};  // I-type
        alu_op = `ALU_ADD;
        alu_src = 0;
        reg_write = 0;
        mem_read = 0;
        mem_write = 0;

        case (opcode)
            `OP_RTYPE: begin
                alu_src = 0;
                reg_write = 1;
                case ({funct7, funct3})
                    {7'b0000000, 3'b000}: alu_op = `ALU_ADD;
                    {7'b0100000, 3'b000}: alu_op = `ALU_SUB;
                    default: alu_op = `ALU_ADD;
                endcase
            end
            `OP_ITYPE: begin
                alu_src = 1;
                reg_write = 1;
                alu_op = `ALU_ADD;
            end
            `OP_LOAD: begin
                alu_src = 1;
                reg_write = 1;
                mem_read = 1;
                alu_op = `ALU_ADD;
            end
            `OP_STORE: begin
                alu_src = 1;
                mem_write = 1;
                alu_op = `ALU_ADD;
                imm_out = {{20{instr[31]}}, instr[31:25], instr[11:7]}; // S-type
            end
            default: begin end
        endcase
    end
endmodule

// ======== Register File =========
module reg_file(
    input wire clk,
    input wire [`REG_ADDR_W-1:0] rs1, rs2, rd,
    input wire [`XLEN-1:0] rd_data,
    input wire reg_write,
    output wire [`XLEN-1:0] rs1_data,
    output wire [`XLEN-1:0] rs2_data
);
    reg [`XLEN-1:0] regs [0:31];

    assign rs1_data = regs[rs1];
    assign rs2_data = regs[rs2];

    always @(posedge clk) begin
        if (reg_write && rd != 0)
            regs[rd] <= rd_data;
    end

    integer i;
    
    initial begin
        
        for (i = 0; i < 32; i = i + 1)
            regs[i] = 0;
    end
endmodule

// ======== ALU =========
module alu(input wire [31:0] in1, input wire [31:0] in2, input wire [2:0] alu_op, output reg [31:0] out);
    always @(*) begin
        case (alu_op)
            3'b000: out = in1 + in2;
            3'b001: out = in1 - in2;
            3'b010: out = in1 & in2;
            3'b011: out = in1 | in2;
            3'b100: out = in1 ^ in2;
            3'b101: out = ($signed(in1) < $signed(in2)) ? 32'b1 : 32'b0;
            default: out = 0;
        endcase
    end
endmodule

// ======== Data Memory =========
module data_mem(
    input wire clk,
    input wire [31:0] addr,
    input wire [31:0] write_data,
    input wire read_en,
    input wire write_en,
    output reg [31:0] read_data
);
    reg [31:0] memory [0:255];

    always @(posedge clk) begin
        if (write_en)
            memory[addr[9:2]] <= write_data;
        if (read_en)
            read_data <= memory[addr[9:2]];
    end
endmodule
