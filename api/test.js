module.exports = (req, res) => {
  res.status(200).json({ 
    message: "Vanilla Node function is working!",
    timestamp: new Date().toISOString()
  });
};
