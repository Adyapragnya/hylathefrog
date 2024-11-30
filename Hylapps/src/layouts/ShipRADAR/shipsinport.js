import { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Stack, MenuItem, ListItemIcon, Modal, TextField, Button, Typography, Select, Checkbox, ListItemText } from '@mui/material';
import { AccountCircle, Send } from '@mui/icons-material';
import axios from 'axios';
import { MaterialReactTable } from 'material-react-table';

// Sorting function to order GeofenceType as Berth > Terminal > Anchorage > N/A
const sortGeofenceType = (a, b) => {
  const order = { Berth: 1, Terminal: 2, Anchorage: 3, 'N/A': 4 };
  return (order[a.GeofenceType] || 5) - (order[b.GeofenceType] || 5); // Default to a value greater than 4 for unknown types
};

const formatEntries = (trackedVessels = []) => {
  return trackedVessels
  .filter((vessel) => vessel.AisPullGfType === 'inport') // Only show vessels in port
    .map(vessel => ({
      AISName: vessel.AIS?.NAME || 'Unknown Vessel',
      GeofenceStatus: vessel.GeofenceStatus || '-',
      ETA: vessel.AIS?.ETA || 'N/A',
      Destination: vessel.AIS?.DESTINATION || 'N/A',
      GeofenceType: vessel.GeofenceType || '-',
      CaseId: vessel.CaseId || '-'
    }))
    .sort(sortGeofenceType); // Apply sorting here to ensure Berth is at the top
};

const shipsinport = ({ vessels = [], onRowClick }) => {
  const [dataSource, setDataSource] = useState([]);
  const [trackedVessels, setTrackedVessels] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const [openModal, setOpenModal] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [email, setEmail] = useState('');
  const [selectedNames, setSelectedNames] = useState([]); // For multi-select
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const fetchTrackedVessels = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_BASE_URL;
        const trackedVesselsResponse = await axios.get(`${baseURL}/api/get-tracked-vessels`);
        setTrackedVessels(trackedVesselsResponse.data);
        console.log(trackedVesselsResponse);
      } catch (error) {
        console.error('Error fetching tracked vessels:', error);
      }
    };
    fetchTrackedVessels();
  }, []);

  useEffect(() => {
    if (trackedVessels.length > 0) {
      const formattedData = formatEntries(trackedVessels);
      setDataSource(formattedData); // Always sort when data changes
    }
  }, [trackedVessels]);

  useEffect(() => {
    // Fetch users (names and emails) for the modal
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/get-users`);
        setUsersList(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  const handleRowClick = (rowData) => {
    const selectedVesselName = rowData.AISName ? rowData.AISName.trim() : '';
    if (!selectedVesselName) {
      console.warn('AISName is undefined or empty in rowData:', rowData);
      return;
    }

    const selectedVesselData = vessels.find(vessel => vessel.name.trim() === selectedVesselName);
    if (selectedVesselData) {
      onRowClick(selectedVesselData);
    } else {
      console.warn(`Vessel data not found for: ${selectedVesselName}`);
    }
  };

  // Filter data based on the search query
  const filteredData = useMemo(() => {
    if (searchQuery) {
      return dataSource.filter((row) => 
        row.AISName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.Destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.GeofenceType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return dataSource;
  }, [dataSource, searchQuery]);

  const columns = useMemo(() => [
    {
      header: 'Case Id',
      accessorKey: 'CaseId',
      cell: (info) => <Box sx={{ textAlign: 'center' }}>{info.getValue()}</Box>,
    },
    {
      header: 'Vessel Name',
      accessorKey: 'AISName',
      cell: (info) => <Box sx={{ textAlign: 'center' }}>{info.getValue()}</Box>,
    },
    {
      header: 'ETA',
      accessorKey: 'ETA',
      cell: (info) => {
        const rawEta = info.getValue();
        // Convert the raw string to the desired format with local timezone
        const formattedEta = rawEta
          ? new Date(rawEta).toLocaleString('en-US', {
              day: '2-digit',
              month: 'short', // Jan, Feb, etc.
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false, // 24-hour format
              timeZoneName: 'short', // Include time zone abbreviation (e.g., GMT, EST)
            }).replace(',', '') // Remove the comma between date and time
          : 'N/A'; // Handle cases where ETA is missing
        return <Box sx={{ textAlign: 'center' }}>{formattedEta}</Box>;
      },
    },
    {
      header: 'Destination',
      accessorKey: 'Destination',
      cell: (info) => <Box sx={{ textAlign: 'center' }}>{info.getValue()}</Box>,
    },
    {
      header: 'Region Name',
      accessorKey: 'GeofenceType',
      cell: (info) => <Box sx={{ textAlign: 'center' }}>{info.getValue()}</Box>,
    },
    {
      header: 'Location',
      accessorKey: 'GeofenceStatus',
      cell: (info) => <Box sx={{ textAlign: 'center' }}>{info.getValue()}</Box>,
    },
  ], []);

  const renderRowActionMenuItems = ({ closeMenu, row }) => [
    <MenuItem
      key={0}
      onClick={() => {
        closeMenu();
        handleRowClick(row.original);
      }}
      sx={{ m: 0 }}
    >
      <ListItemIcon>
        <AccountCircle />
      </ListItemIcon>
      View Vessel Details
    </MenuItem>,
    <MenuItem
      key={1}
      onClick={() => {
        closeMenu();
        setSelectedVessel(row.original);
        setOpenModal(true); // Open the modal to send alert
      }}
      sx={{ m: 0 }}
    >
      <ListItemIcon>
        <Send />
      </ListItemIcon>
      Send Alert
    </MenuItem>,
  ];

  const handleCloseModal = () => {
    setOpenModal(false);
    setEmail('');
    setSelectedNames([]); // Reset the selection
  };

  const handleSendAlert = async () => {
    if (selectedNames.length === 0 || !email) {
      alert('Please select at least one user and enter an email.');
      return;
    }

    try {
      // Send the alert email (this is a placeholder for your backend API logic)
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/send-alert`, {
        names: selectedNames,
        email,
        vessel: selectedVessel?.AISName,
      });
      if (response.data.success) {
        alert('Alert sent successfully!');
      } else {
        alert('Failed to send alert.');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error sending alert:', error);
      alert('An error occurred while sending the alert.');
    }
  };

  return (
    <div className="geofence-histories">
      {/* Search input field */}
      <Box sx={{ marginBottom: '16px' }}>
        <TextField
          label="Search"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ borderRadius: 2 }}
        />
      </Box>

      {filteredData.length === 0 ? (
        <p>No vessels data to display</p>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={filteredData} // Pass filtered data here
          enableColumnResizing
          enableGrouping
          enablePagination
          enableColumnPinning
          enableExport
          enableDensityToggle
          enableRowActions
          renderRowActionMenuItems={renderRowActionMenuItems}
          initialState={{
            pagination: { pageIndex: 0, pageSize: 5 },
            sorting: [{ desc: false }],
            density: 'compact',
          }}
          muiTableHeadCellProps={{
            style: { fontWeight: 'bold', padding: '8px', textAlign: 'center', color: '#0F67B1' },
          }}
          muiTableBodyRowProps={{
            style: { padding: '15px', textAlign: 'center' },
          }}
          muiTableBodyCellProps={(cell) => {
            const geofenceType = cell.row.original?.GeofenceType;
            let color = '';
            if (geofenceType === 'Berth') color = 'red';
            else if (geofenceType === 'Terminal') color = 'blue';
            else if (geofenceType === 'Anchorage') color = 'green';
            return { style: { color, padding: '15px', textAlign: 'center' } };
          }}
        />
      )}

      {/* Modal for sending alert */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            padding: 4,
            borderRadius: 3,
            boxShadow: 24,
            width: 600,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          <Typography variant="h6" mb={2} sx={{ fontWeight: 'bold' }}>
            Send Alert
          </Typography>

          {/* Multi-Select for User Names */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1 }} style={{ textAlign: 'left' }}>
              User Names
            </Typography>
            <Select
              multiple
              fullWidth
              value={selectedNames}
              onChange={(e) => setSelectedNames(e.target.value)}
              renderValue={(selected) => selected.join(', ')}
              sx={{
                borderRadius: 2,
              }}
            >
              {usersList.map((user) => (
                <MenuItem key={user.id} value={user.name}>
                  <Checkbox checked={selectedNames.includes(user.name)} />
                  <ListItemText primary={user.name} />
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Dropdown for User Email */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1 }} style={{ textAlign: 'left' }}>
              User Email
            </Typography>
            <Select
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                borderRadius: 2,
              }}
            >
              {usersList.map((user) => (
                <MenuItem key={user.id} value={user.email}>
                  {user.email}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Button variant="outlined" onClick={handleCloseModal} sx={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendAlert}
              sx={{
                flex: 1,
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
              }}
            >
              Send
            </Button>
          </Stack>
        </Box>
      </Modal>
    </div>
  );
};

shipsinport.propTypes = {
  vessels: PropTypes.array.isRequired,
  onRowClick: PropTypes.func.isRequired,
};

export default shipsinport;
