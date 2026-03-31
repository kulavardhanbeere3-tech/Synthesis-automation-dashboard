from rest_framework import serializers
from .models import VerilogFile, Netlist, LibraryFile

class VerilogFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerilogFile
        fields = ['id', 'file', 'original_name', 'uploaded_at']

class NetlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Netlist
        fields = ['id', 'verilog_file', 'file', 'created_at']

class LibraryFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryFile
        fields = ['id', 'file', 'uploaded_at'] 