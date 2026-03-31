from django.db import models
from .overwrite_storage import OverwriteStorage

# Create your models here.

class VerilogFile(models.Model):
    file = models.FileField(upload_to='verilog_uploads/', storage=OverwriteStorage())
    original_name = models.CharField(max_length=255, blank=True)
    library = models.FileField(upload_to='verilog_uploads/', null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name

class Netlist(models.Model):
    verilog_file = models.ForeignKey(VerilogFile, on_delete=models.CASCADE, related_name='netlists')
    file = models.FileField(upload_to='netlists/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Netlist for {self.verilog_file.file.name} ({self.id})"

class LibraryFile(models.Model):
    file = models.FileField(upload_to='verilog_uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name
