import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { Drawer, List, ListItem, ListItemText, Divider, Select, MenuItem, Button, Box, Typography, Toolbar, AppBar, IconButton, Dialog, DialogTitle, DialogContent, InputLabel, FormControl } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';

const drawerWidth = 260;

function App() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [response, setResponse] = useState(null);
  const [files, setFiles] = useState([]);
  const [synthResult, setSynthResult] = useState({});
  const [selectedDesign, setSelectedDesign] = useState('');
  const [netlists, setNetlists] = useState([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewFileContent, setViewFileContent] = useState('');
  const [viewFileName, setViewFileName] = useState('');
  const [viewNetlist, setViewNetlist] = useState(false);
  const [viewNetlistContent, setViewNetlistContent] = useState('');
  const [viewNetlistName, setViewNetlistName] = useState('');
  const [libraryFile, setLibraryFile] = useState(null);
  const [libraryUploadStatus, setLibraryUploadStatus] = useState('');
  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState('');
  const [selectedLibraryForDisplay, setSelectedLibraryForDisplay] = useState('');

  useEffect(() => {
    fetchFiles();
    fetchLibraries();
  }, []);

  useEffect(() => {
    if (selectedDesign) fetchNetlists(selectedDesign);
    else setNetlists([]);
  }, [selectedDesign]);

  // Auto-refresh netlists when synthesis completes
  useEffect(() => {
    if (selectedDesign && synthResult[selectedDesign]?.result && !synthResult[selectedDesign]?.loading) {
      fetchNetlists(selectedDesign);
    }
  }, [selectedDesign, synthResult]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/synthesis/files/');
      console.log('Fetched files:', res.data);
      setFiles(res.data);
    } catch (err) {
      console.error('Error fetching files:', err);
      setFiles([]);
    }
  };

  const fetchLibraries = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/synthesis/libraries/');
      console.log('Fetched libraries:', res.data);
      setLibraries(res.data);
    } catch (err) {
      console.error('Error fetching libraries:', err);
      setLibraries([]);
    }
  };

  const fetchNetlists = async (designId) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/synthesis/files/${designId}/netlists/`);
      setNetlists(res.data);
    } catch (err) {
      setNetlists([]);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadStatus('Please select a file.');
      return;
    }
    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:8000/api/synthesis/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResponse(res.data);
      setUploadStatus('Upload successful!');
      setFile(null);
      
      // Clear the file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Add a small delay to ensure backend processing is complete
      setTimeout(async () => {
        try {
          await fetchFiles();
        } catch (err) {
          console.error('Failed to refresh file list:', err);
          // If fetchFiles fails, try again after a longer delay
          setTimeout(async () => {
            try {
              await fetchFiles();
            } catch (err2) {
              console.error('Second attempt to refresh file list failed:', err2);
            }
          }, 1000);
        }
      }, 500);
      
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('Upload failed: ' + (err.response?.data?.detail || err.message || 'Unknown error'));
    }
  };

  const handleSynthesize = async () => {
    if (!selectedDesign) return;
    setSynthResult((prev) => ({ ...prev, [selectedDesign]: { loading: true } }));
    try {
      // Call backend to run synthesis using Docker/Yosys
      const res = await axios.post(`http://localhost:8000/api/synthesis/synthesize/${selectedDesign}/`);
      setSynthResult((prev) => ({ 
        ...prev, 
        [selectedDesign]: { 
          loading: false, 
          result: res.data,
          // Clear any previous netlist errors when synthesis succeeds
          netlistError: null,
          netlistStdout: null,
          netlistStderr: null
        } 
      }));
      
      // Force a re-render to update the UI immediately
      setTimeout(() => {
        setSynthResult((prev) => ({ ...prev }));
      }, 100);
      
    } catch (err) {
      setSynthResult((prev) => ({ ...prev, [selectedDesign]: { loading: false, error: 'Synthesis failed.' } }));
    }
  };

  // Library file upload handlers
  const handleLibraryFileChange = (e) => {
    setLibraryFile(e.target.files[0]);
  };

  const handleLibraryUpload = async (e) => {
    e.preventDefault();
    if (!libraryFile) {
      setLibraryUploadStatus('Please select a library file.');
      return;
    }
    setLibraryUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', libraryFile);
    try {
      await axios.post('http://localhost:8000/api/synthesis/upload_library/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLibraryUploadStatus('Upload successful!');
      setLibraryFile(null);
      
      // Clear the library file input
      const libraryFileInput = document.querySelector('input[accept=".lib"]');
      if (libraryFileInput) {
        libraryFileInput.value = '';
      }
      
      // Add a small delay to ensure backend processing is complete
      setTimeout(async () => {
        try {
          await fetchLibraries();
        } catch (err) {
          console.error('Failed to refresh library list:', err);
          // If fetchLibraries fails, try again after a longer delay
          setTimeout(async () => {
            try {
              await fetchLibraries();
            } catch (err2) {
              console.error('Second attempt to refresh library list failed:', err2);
            }
          }, 1000);
        }
      }, 500);
      
    } catch (err) {
      console.error('Library upload error:', err);
      setLibraryUploadStatus('Upload failed: ' + (err.response?.data?.detail || err.message || 'Unknown error'));
    }
  };

  // Update netlist generation to include library_id
  const handleGenerateNetlist = async () => {
    if (!selectedDesign) return;
    
    // Set loading state for netlist generation
    setSynthResult(prev => ({
      ...prev,
      [selectedDesign]: {
        ...prev[selectedDesign],
        netlistLoading: true,
        netlistError: null,
        netlistStdout: null,
        netlistStderr: null
      }
    }));
    
    try {
      const res = await axios.post(
        `http://localhost:8000/api/synthesis/files/${selectedDesign}/generate_netlist/`,
        selectedLibrary ? { library_id: selectedLibrary } : {}
      );
      
      // Update netlists list immediately
      await fetchNetlists(selectedDesign);
      
      // Clear loading state and any errors
      setSynthResult(prev => ({
        ...prev,
        [selectedDesign]: {
          ...prev[selectedDesign],
          netlistLoading: false,
          netlistError: null,
          netlistStdout: null,
          netlistStderr: null
        }
      }));
      
      // Show the generated netlist immediately
      if (res.data.netlist_content) {
        setViewNetlistContent(res.data.netlist_content);
        setViewNetlistName(
          (res.data.netlist && res.data.netlist.file && res.data.netlist.file.split('/').pop()) ||
          (res.data.netlist_content_name) ||
          'Netlist'
        );
        setViewNetlist(true);
      }
      
      // Force a re-render to update the UI immediately
      setTimeout(() => {
        setSynthResult((prev) => ({ ...prev }));
      }, 100);
      
    } catch (err) {
      console.error('Netlist generation error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || 'Unknown error';
      
      // Store detailed error information and clear loading state
      setSynthResult(prev => ({
        ...prev,
        [selectedDesign]: {
          ...prev[selectedDesign],
          netlistLoading: false,
          netlistError: errorMessage,
          netlistStdout: err.response?.data?.stdout || null,
          netlistStderr: err.response?.data?.stderr || null,
          netlistReturnCode: err.response?.data?.returncode || null,
          netlistOutputDir: err.response?.data?.output_dir || null,
          netlistExpectedFile: err.response?.data?.expected_file || null,
          netlistFoundFiles: err.response?.data?.found_files || null
        }
      }));
      
      alert(`Failed to generate netlist: ${errorMessage}`);
    }
  };

  const handleDeleteDesign = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/synthesis/files/${id}/delete/`);
      fetchFiles();
      if (selectedDesign === id) setSelectedDesign('');
    } catch (err) {
      alert('Failed to delete design.');
    }
  };

  const handleViewDesign = async (fileObj) => {
    try {
      // Fetch file content from backend API endpoint
      const res = await axios.get(`http://localhost:8000/api/synthesis/files/${fileObj.id}/content/`, { responseType: 'text' });
      setViewFileContent(res.data);
      setViewFileName(fileObj.file.split('/').pop());
      setViewDialogOpen(true);
    } catch (err) {
      setViewFileContent('Failed to load file content.');
      setViewFileName(fileObj.file.split('/').pop());
      setViewDialogOpen(true);
    }
  };

  const handleViewNetlist = async (netlist) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/synthesis/netlists/${netlist.id}/content/`, { responseType: 'text' });
      setViewNetlistContent(res.data);
      setViewNetlistName(netlist.file.split('/').pop());
      setViewNetlist(true);
    } catch (err) {
      setViewNetlistContent('Failed to load netlist content.');
      setViewNetlistName(netlist.file.split('/').pop());
      setViewNetlist(true);
    }
  };

  const handleDeleteNetlist = async (netlistId) => {
    try {
      await axios.delete(`http://localhost:8000/api/synthesis/netlists/${netlistId}/delete/`);
      fetchNetlists(selectedDesign);
    } catch (err) {
      alert('Failed to delete netlist.');
    }
  };

  const handleViewLibrary = async (library) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/synthesis/libraries/${library.id}/content/`, { responseType: 'text' });
      // Assuming the content is the library file content
      setViewNetlistContent(res.data);
      setViewNetlistName(library.file.split('/').pop());
      setViewNetlist(true);
    } catch (err) {
      console.error('Library view error:', err);
      const errorMessage = err.response?.data || err.message || 'Unknown error';
      setViewNetlistContent(`Failed to load library content: ${errorMessage}`);
      setViewNetlistName(library.file.split('/').pop());
      setViewNetlist(true);
    }
  };

  const handleDeleteLibrary = async (libraryId) => {
    try {
      await axios.delete(`http://localhost:8000/api/synthesis/libraries/${libraryId}/delete/`);
      fetchLibraries();
      if (selectedLibraryForDisplay === libraryId) setSelectedLibraryForDisplay('');
    } catch (err) {
      alert('Failed to delete library.');
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'center' }}>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
            Yosys Tool Synthesis Automated Dashboard
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: '#f7f9fc' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Designs</Typography>
          <List dense>
            {files.length === 0 && <ListItem><ListItemText primary="No designs uploaded." /></ListItem>}
            {files.map(file => (
              <ListItem
                key={file.id}
                selected={selectedDesign === file.id}
                onClick={() => setSelectedDesign(file.id)}
                secondaryAction={
                  <>
                    <IconButton edge="end" aria-label="view" onClick={e => { e.stopPropagation(); handleViewDesign(file); }}>
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={e => { e.stopPropagation(); handleDeleteDesign(file.id); }}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText primary={file.file.split('/').pop()} />
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            disabled={!selectedDesign}
            onClick={handleSynthesize}
            sx={{ mb: 3 }}
          >
            Run Synthesis
          </Button>
          {synthResult[selectedDesign]?.result && (
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              disabled={synthResult[selectedDesign]?.netlistLoading}
              onClick={handleGenerateNetlist}
              sx={{ mb: 2 }}
            >
              {synthResult[selectedDesign]?.netlistLoading ? 'Generating Netlist...' : 'Generate Netlist'}
            </Button>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Netlists</Typography>
          <List dense>
            {netlists.length === 0 && <ListItem><ListItemText primary="No netlists yet." /></ListItem>}
            {netlists.map(nl => (
              <ListItem key={nl.id} alignItems="flex-start"
                secondaryAction={
                  <>
                    <IconButton edge="end" aria-label="view" onClick={e => { e.stopPropagation(); handleViewNetlist(nl); }}>
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={e => { e.stopPropagation(); handleDeleteNetlist(nl.id); }}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={nl.file.split('/').pop()}
                  secondary={
                    <Box component="span" sx={{ fontSize: '0.85em', color: '#555' }}>
                      {files.find(f => f.id === nl.verilog_file)?.file.split('/').pop()}
                      <br />
                      <Typography variant="caption">{new Date(nl.created_at).toLocaleString()}</Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Libraries</Typography>
          <List dense>
            {libraries.length === 0 && <ListItem><ListItemText primary="No libraries uploaded." /></ListItem>}
            {libraries.map(lib => (
              <ListItem
                key={lib.id}
                selected={selectedLibraryForDisplay === lib.id}
                onClick={() => {
                  setSelectedLibraryForDisplay(lib.id);
                  setSelectedLibrary(lib.id); // Sync with the dropdown selection
                }}
                secondaryAction={
                  <>
                    <IconButton edge="end" aria-label="view" onClick={e => { e.stopPropagation(); handleViewLibrary(lib); }}>
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={e => { e.stopPropagation(); handleDeleteLibrary(lib.id); }}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {lib.file.split('/').pop()}
                      {selectedLibrary === lib.id && (
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          (Selected)
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption">{new Date(lib.uploaded_at).toLocaleString()}</Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f0f2f5', minHeight: '100vh', p: 3 }}>
        <Toolbar />
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
          <Typography variant="h5" sx={{ color: '#1976d2', mb: 2 }}>Upload Verilog File</Typography>
          <form onSubmit={handleUpload} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="file" accept=".v,.sv" onChange={handleFileChange} style={{ flex: 1 }} />
            <Button type="submit" variant="contained" color="primary">Upload</Button>
          </form>
          <Typography sx={{ color: uploadStatus.includes('success') ? 'green' : uploadStatus.includes('fail') ? 'red' : '#333', mt: 1 }}>{uploadStatus}</Typography>
          {response && (
            <Box sx={{ mt: 2, bgcolor: '#f4f6fa', borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle2">File Uploaded:</Typography>
              <pre style={{ margin: 0 }}>{JSON.stringify(response, null, 2)}</pre>
            </Box>
          )}
        </Box>
        {/* Library upload section */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Typography variant="h5" sx={{ color: '#1976d2', mb: 2 }}>Upload Library File</Typography>
          <form onSubmit={handleLibraryUpload} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="file" accept=".lib" onChange={handleLibraryFileChange} style={{ flex: 1 }} />
            <Button type="submit" variant="contained" color="secondary">Upload</Button>
          </form>
          <Typography sx={{ color: libraryUploadStatus.includes('success') ? 'green' : libraryUploadStatus.includes('fail') ? 'red' : '#333', mt: 1 }}>{libraryUploadStatus}</Typography>
        </Box>
        {/* Library selection for netlist generation */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="library-select-label">Select Library (optional)</InputLabel>
            <Select
              labelId="library-select-label"
              value={selectedLibrary}
              label="Select Library (optional)"
              onChange={e => {
                setSelectedLibrary(e.target.value);
                setSelectedLibraryForDisplay(e.target.value); // Sync with sidebar
              }}
            >
              <MenuItem value="">None</MenuItem>
              {libraries.map(lib => (
                <MenuItem key={lib.id} value={lib.id}>{lib.file.split('/').pop()}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        {/* Uploaded Files */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Typography variant="h5" sx={{ color: '#1976d2', mb: 2 }}>Uploaded Files</Typography>
          {files.length === 0 ? (
            <Typography>No files uploaded yet.</Typography>
          ) : (
            <Box>
              {files.map((f) => (
                <Box key={f.id} sx={{ borderBottom: '1px solid #eee', py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography fontWeight={600}>{f.file.split('/').pop()}</Typography>
                      <Typography variant="body2" color="text.secondary">Uploaded: {new Date(f.uploaded_at).toLocaleString()}</Typography>
                    </Box>
                  </Box>
                  {/* Synthesis running info/result for this file */}
                  {selectedDesign === f.id && synthResult[f.id]?.loading && (
                    <Typography sx={{ color: '#1976d2', mt: 1 }}>Running synthesis...</Typography>
                  )}
                  {selectedDesign === f.id && synthResult[f.id]?.result && (
                    <Typography sx={{ color: 'green', mt: 1 }}>Synthesis complete. See full output below.</Typography>
                  )}
                  {selectedDesign === f.id && synthResult[f.id]?.error && (
                    <Typography sx={{ color: 'red', mt: 1 }}>{synthResult[f.id].error}</Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
        {/* Dedicated section for full Yosys output */}
        {selectedDesign && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 5, mb: 5, p: 3, bgcolor: '#fff', borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h5" sx={{ color: '#1976d2', mb: 2 }}>Yosys Synthesis Output</Typography>
            {synthResult[selectedDesign]?.loading && (
              <Typography sx={{ color: '#1976d2' }}>Running synthesis for selected design...</Typography>
            )}
            {synthResult[selectedDesign]?.result && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>stdout:</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f4f6fa', p: 2, borderRadius: 1, mb: 2, maxHeight: 300, overflow: 'auto' }}>
                  {synthResult[selectedDesign].result.stdout || '(no output)'}
                </Box>
                {synthResult[selectedDesign].result.stderr && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'red' }}>stderr:</Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff0f0', p: 2, borderRadius: 1, maxHeight: 200, overflow: 'auto', color: 'red' }}>
                      {synthResult[selectedDesign].result.stderr}
                    </Box>
                  </>
                )}
              </>
            )}
            {synthResult[selectedDesign]?.error && (
              <Typography sx={{ color: 'red' }}>{synthResult[selectedDesign].error}</Typography>
            )}
          </Box>
        )}
        
        {/* Netlist Generation Error Display */}
        {selectedDesign && synthResult[selectedDesign]?.netlistError && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 3, mb: 5, p: 3, bgcolor: '#fff0f0', borderRadius: 2, border: '1px solid #ffcdd2' }}>
            <Typography variant="h6" sx={{ color: '#d32f2f', mb: 2 }}>Netlist Generation Error</Typography>
            {synthResult[selectedDesign]?.netlistError && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#d32f2f' }}>Error:</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff', p: 2, borderRadius: 1, mb: 2, maxHeight: 200, overflow: 'auto', border: '1px solid #ffcdd2' }}>
                  {synthResult[selectedDesign].netlistError}
                </Box>
                {synthResult[selectedDesign]?.netlistReturnCode !== null && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Return Code:</Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff', p: 2, borderRadius: 1, mb: 2, maxHeight: 100, overflow: 'auto', border: '1px solid #ffcdd2' }}>
                      {synthResult[selectedDesign].netlistReturnCode}
                    </Box>
                  </>
                )}
                {synthResult[selectedDesign]?.netlistExpectedFile && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Expected File:</Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff', p: 2, borderRadius: 1, mb: 2, maxHeight: 100, overflow: 'auto', border: '1px solid #ffcdd2' }}>
                      {synthResult[selectedDesign].netlistExpectedFile}
                    </Box>
                  </>
                )}
                {synthResult[selectedDesign]?.netlistFoundFiles && synthResult[selectedDesign].netlistFoundFiles.length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Found Files:</Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff', p: 2, borderRadius: 1, mb: 2, maxHeight: 100, overflow: 'auto', border: '1px solid #ffcdd2' }}>
                      {synthResult[selectedDesign].netlistFoundFiles.join(', ')}
                    </Box>
                  </>
                )}
                {synthResult[selectedDesign]?.netlistOutputDir && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Output Directory:</Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff', p: 2, borderRadius: 1, mb: 2, maxHeight: 100, overflow: 'auto', border: '1px solid #ffcdd2' }}>
                      {synthResult[selectedDesign].netlistOutputDir}
                    </Box>
                  </>
                )}
              </>
            )}
            <Typography variant="body2" sx={{ color: '#d32f2f', mb: 2, fontStyle: 'italic' }}>
              💡 Tip: Complex designs with clock gating, scan chains, or multiple clock domains may fail synthesis. 
              Try uploading a simplified version of your design (e.g., full_adder_simple.v or full_adder_seq.v).
            </Typography>
            {synthResult[selectedDesign]?.netlistError && synthResult[selectedDesign].netlistError.includes("no such file or directory") && (
              <Typography variant="body2" sx={{ color: '#d32f2f', mb: 2, fontStyle: 'italic' }}>
                🔧 Yosys Installation Issue: The synthesis tool is not available. 
                Run <code>python install_yosys.py</code> to install Yosys locally, or ensure Docker is working properly.
              </Typography>
            )}
            {synthResult[selectedDesign]?.netlistStdout && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Yosys stdout:</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff', p: 2, borderRadius: 1, mb: 2, maxHeight: 200, overflow: 'auto', border: '1px solid #ffcdd2' }}>
                  {synthResult[selectedDesign].netlistStdout}
                </Box>
              </>
            )}
            {synthResult[selectedDesign]?.netlistStderr && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#d32f2f' }}>Yosys stderr:</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#fff', p: 2, borderRadius: 1, maxHeight: 200, overflow: 'auto', color: '#d32f2f', border: '1px solid #ffcdd2' }}>
                  {synthResult[selectedDesign].netlistStderr}
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* View Design Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>View Design: {viewFileName}</DialogTitle>
        <DialogContent>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f4f6fa', p: 2, borderRadius: 1, maxHeight: 500, overflow: 'auto' }}>
            {viewFileContent}
          </Box>
        </DialogContent>
      </Dialog>
      {/* View Netlist Dialog */}
      <Dialog open={viewNetlist} onClose={() => setViewNetlist(false)} maxWidth="md" fullWidth>
        <DialogTitle>View Netlist: {viewNetlistName}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            {viewNetlistContent && (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => {
                  const blob = new Blob([viewNetlistContent], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = viewNetlistName || 'netlist.v';
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }, 0);
                }}
                sx={{ mb: 1 }}
              >
                Download
              </Button>
            )}
          </Box>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f4f6fa', p: 2, borderRadius: 1, maxHeight: 500, overflow: 'auto' }}>
            {viewNetlistContent}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default App;
