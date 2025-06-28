# Wanderlust - Listing Management System

A Node.js application for managing property listings with image upload functionality.

## Features

- User authentication and authorization
- Create, read, update, and delete listings
- Image upload and management
- Review system
- Responsive design

## Image Upload Features

### Supported Features
- **File Upload**: Users can upload images when creating or editing listings
- **File Validation**: Only image files are allowed (JPEG, PNG, GIF, etc.)
- **File Size Limit**: Maximum 5MB per image
- **Automatic File Management**: Old images are automatically deleted when replaced
- **Fallback Images**: Default images are shown when no image is uploaded
- **Error Handling**: Graceful error handling for upload failures

### Technical Details
- **Storage**: Images are stored locally in `public/uploads/` directory
- **File Naming**: Unique filenames with timestamps to prevent conflicts
- **Static Serving**: Images are served via Express static middleware
- **Cleanup**: Associated image files are deleted when listings are removed

### Usage
1. **Creating a Listing**: Use the "Create New Listing" form and upload an image
2. **Editing a Listing**: Upload a new image to replace the existing one
3. **Removing Images**: Check the "Remove current image" checkbox in edit form
4. **Viewing Images**: Images are displayed in listing cards and detail pages

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your MongoDB connection string:
   ```
   ATLASDB_URL=your_mongodb_connection_string
   SECRET=your_session_secret
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Visit `http://localhost:3000` in your browser

## File Structure

```
├── app.js                 # Main application file
├── models/               # Database models
├── views/                # EJS templates
├── public/               # Static files
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript files
│   └── uploads/         # Uploaded images
├── routes/               # Route handlers
└── utils/                # Utility functions
```

## Dependencies

- Express.js - Web framework
- Mongoose - MongoDB ODM
- Multer - File upload handling
- EJS - Template engine
- Passport.js - Authentication
- Express-session - Session management
- Connect-flash - Flash messages 