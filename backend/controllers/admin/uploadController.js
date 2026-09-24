

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Return the filename and url
    const filename = req.file.filename;
    const url = `/uploads/${filename}`;
    return res.status(200).json({ success: true, filename, url });
  } catch (error) {
    console.error('Image upload error', error);
    return res.status(500).json({ success: false, message: 'Error uploading image' });
  }
};
