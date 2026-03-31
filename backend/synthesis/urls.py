from django.urls import path
from .views import VerilogFileUploadView, YosysSynthesisView, VerilogFileListView, VerilogFileContentView, NetlistGenerateView, NetlistListView, NetlistContentView, NetlistDeleteView, LibraryFileUploadView, LibraryFileListView, LibraryFileContentView, LibraryFileDeleteView, VerilogFileDeleteView, TestView

urlpatterns = [
    path('test/', TestView.as_view(), name='test'),
    path('upload/', VerilogFileUploadView.as_view(), name='verilog-upload'),
    path('synthesize/<int:pk>/', YosysSynthesisView.as_view(), name='verilog-synthesize'),
    path('files/', VerilogFileListView.as_view(), name='verilog-files'),
    path('files/<int:pk>/content/', VerilogFileContentView.as_view(), name='verilog-file-content'),
    path('files/<int:pk>/generate_netlist/', NetlistGenerateView.as_view(), name='generate-netlist'),
    path('files/<int:pk>/netlists/', NetlistListView.as_view(), name='list-netlists'),
    path('files/<int:pk>/delete/', VerilogFileDeleteView.as_view(), name='verilogfile-delete'),
    path('netlists/<int:pk>/content/', NetlistContentView.as_view(), name='netlist-content'),
    path('netlists/<int:pk>/delete/', NetlistDeleteView.as_view(), name='netlist-delete'),
    path('upload_library/', LibraryFileUploadView.as_view(), name='library-upload'),
    path('libraries/', LibraryFileListView.as_view(), name='library-list'),
    path('libraries/<int:pk>/content/', LibraryFileContentView.as_view(), name='library-content'),
    path('libraries/<int:pk>/delete/', LibraryFileDeleteView.as_view(), name='library-delete'),
] 