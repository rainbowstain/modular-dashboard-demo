import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// Generate realistic sensor data for 1 month (30 days) with hourly measurements
const generateSensorData = () => {
  const sensors = [
    { id: 1, label: 'Temperatura', baseValue: 17, unit: '°C', variance: 8 },
    { id: 2, label: 'Humedad Aire', baseValue: 74, unit: '%', variance: 15 },
    { id: 3, label: 'Humedad Volumétrica', baseValue: 96, unit: 'VWC', variance: 20 },
    { id: 4, label: 'ON/OFF 2', baseValue: 0, unit: 'bool', variance: 0 },
    { id: 5, label: 'ON/OFF 1', baseValue: 0, unit: 'bool', variance: 0 },
    { id: 6, label: 'Radiación PAR', baseValue: 1043, unit: 'µmol m⁻² s⁻¹', variance: 400 }
  ];

  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 30 days ago

  sensors.forEach(sensor => {
    for (let day = 0; day < 30; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        currentDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        let value;
        if (sensor.unit === 'bool') {
          // Boolean sensors have occasional ON periods
          value = Math.random() < 0.15 ? 1 : 0;
        } else if (sensor.label === 'Temperatura') {
          // Temperature varies with day/night cycle
          const timeOfDay = Math.sin((hour / 24) * 2 * Math.PI - Math.PI/2) + 1;
          const seasonalVariation = Math.sin((day / 30) * 2 * Math.PI) * 3;
          value = Math.round((sensor.baseValue + timeOfDay * 6 + seasonalVariation + (Math.random() - 0.5) * 4) * 10) / 10;
        } else if (sensor.label === 'Humedad Aire') {
          // Humidity inversely related to temperature
          const timeOfDay = Math.sin((hour / 24) * 2 * Math.PI + Math.PI/2) + 1;
          value = Math.round(sensor.baseValue + timeOfDay * 8 + (Math.random() - 0.5) * 10);
          value = Math.max(30, Math.min(95, value)); // Clamp between 30-95%
        } else if (sensor.label === 'Radiación PAR') {
          // Solar radiation peaks during day hours
          if (hour >= 6 && hour <= 18) {
            const solarCurve = Math.sin(((hour - 6) / 12) * Math.PI);
            value = Math.round(sensor.baseValue * solarCurve + (Math.random() - 0.5) * 200);
          } else {
            value = Math.round(Math.random() * 50); // Low nighttime values
          }
          value = Math.max(0, value);
        } else {
          // Other sensors with random variations
          value = Math.round(sensor.baseValue + (Math.random() - 0.5) * sensor.variance);
        }

        const timestamp = currentDate.toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        data.push({
          id: `${sensor.id}_${day}_${hour}`,
          sensorId: sensor.id,
          label: sensor.label,
          value: value,
          unit: sensor.unit,
          ts: timestamp,
          date: new Date(currentDate)
        });
      }
    }
  });

  return data;
};

const SensorDashboard = () => {
  const allSensorData = generateSensorData();
  
  // Get the latest reading for each sensor type
  const getLatestSensorReadings = () => {
    const sensorTypes = [1, 2, 3, 4, 5, 6];
    return sensorTypes.map(sensorId => {
      const sensorReadings = allSensorData.filter(reading => reading.sensorId === sensorId);
      return sensorReadings.reduce((latest, current) => 
        current.date > latest.date ? current : latest
      );
    });
  };

  const [sensors, setSensors] = useState(getLatestSensorReadings());
  const [editDialog, setEditDialog] = useState({ open: false, sensor: null });
  const [editValue, setEditValue] = useState('');

  const handleEditClick = (sensor) => {
    setEditDialog({ open: true, sensor });
    setEditValue(sensor.value.toString());
  };

  const handleSaveEdit = () => {
    if (editDialog.sensor && editValue !== '') {
      const updatedSensors = sensors.map(sensor => 
        sensor.id === editDialog.sensor.id 
          ? { ...sensor, value: parseFloat(editValue) || 0 }
          : sensor
      );
      setSensors(updatedSensors);
      setEditDialog({ open: false, sensor: null });
      setEditValue('');
    }
  };

  const handleCloseDialog = () => {
    setEditDialog({ open: false, sensor: null });
    setEditValue('');
  };

  const formatValue = (value, unit) => {
    if (unit === 'bool') {
      return value ? 'ON' : 'OFF';
    }
    return typeof value === 'number' ? value.toLocaleString() : value;
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          Panel de Sensores
        </Typography>
        
        <Grid container spacing={2}>
          {sensors.map((sensor) => (
            <Grid item xs={12} sm={6} md={4} key={sensor.id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                      {sensor.label}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditClick(sensor)}
                      sx={{ color: 'primary.main' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="h3" component="div" sx={{ 
                    fontWeight: 'bold', 
                    mb: 1,
                    color: sensor.unit === 'bool' ? 
                      (sensor.value ? 'success.main' : 'error.main') : 'text.primary'
                  }}>
                    {formatValue(sensor.value, sensor.unit)}
                    <Typography variant="h5" component="span" sx={{ ml: 1, fontWeight: 'normal' }}>
                      {sensor.unit !== 'bool' ? sensor.unit : ''}
                    </Typography>
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary">
                    {sensor.ts}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog open={editDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            Editar {editDialog.sensor?.label}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nuevo Valor"
              type="number"
              fullWidth
              variant="outlined"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              sx={{ mt: 2 }}
              inputProps={{
                step: editDialog.sensor?.unit === '°C' ? 0.1 : 1,
                min: editDialog.sensor?.unit === 'bool' ? 0 : undefined,
                max: editDialog.sensor?.unit === 'bool' ? 1 : undefined
              }}
            />
            {editDialog.sensor && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Unidad: {editDialog.sensor.unit}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSaveEdit} variant="contained">Guardar</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default SensorDashboard; 