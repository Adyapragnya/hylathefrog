import mongoose from 'mongoose';

const PolygonGeofenceSchema = new mongoose.Schema({
    geofenceId: String,
    geofenceName: String,
    geofenceType: String,
    date: String,
    remarks: String,
    seaPort: String,
    coordinates: Array,
    
  });

const PolygonGeofence = mongoose.model('PolygonGeofence', PolygonGeofenceSchema);

export default  PolygonGeofence ;
