import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  Button,
  Paper,
  Alert,
  Snackbar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import ChatIcon from "@mui/icons-material/Chat";
import DescriptionIcon from "@mui/icons-material/Description";
import LanguageIcon from "@mui/icons-material/Language";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CloseIcon from "@mui/icons-material/Close";
import Chat from "./components/Chat";

// Create theme
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#5271ff", // CLAIRE blue
      light: "#5ce1e6",
      dark: "#004aad",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#6e6e80", // Gray
      light: "#9e9eae",
      dark: "#4a4a5a",
      contrastText: "#ffffff",
    },
    background: {
      default: "#202123",
      paper: "#2d2d30",
    },
    text: {
      primary: "#ffffff",
      secondary: "#ececf1",
    },
  },
  typography: {
    fontFamily:
      '"-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          "&:hover": {
            backgroundColor: "#004aad", // Updated to dark blue
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        },
      },
    },
  },
});

const Popup: React.FC = () => {
  const [activeMode, setActiveMode] = useState("general");
  const [showSettings, setShowSettings] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [apiUrl, setApiUrl] = useState("http://localhost:6223/v1");
  const [modelName, setModelName] = useState("google/gemma-3-4b");
  const modeMenuRef = useRef<HTMLDivElement>(null);

  const handleModeSelect = (mode: string) => {
    setActiveMode(mode);
    setShowModeMenu(false);
  };

  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
  };

  const toggleModeMenu = () => {
    setShowModeMenu(!showModeMenu);
  };

  // Close mode menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(event.target as Node)
      ) {
        setShowModeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSaveSettings = () => {
    // Save settings to chrome.storage
    chrome.storage.sync.set(
      {
        lmStudioApiUrl: apiUrl,
        lmStudioModelName: modelName,
      },
      () => {
        console.log("Settings saved");
        setShowSettings(false);
      }
    );
  };

  // Load settings on component mount
  React.useEffect(() => {
    chrome.storage.sync.get(
      ["lmStudioApiUrl", "lmStudioModelName"],
      (result) => {
        if (result.lmStudioApiUrl) {
          setApiUrl(result.lmStudioApiUrl);
        }
        if (result.lmStudioModelName) {
          setModelName(result.lmStudioModelName);
        }
      }
    );
  }, []);

  // Get icon based on active mode
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "pdf":
        return <DescriptionIcon fontSize="small" />;
      case "web":
        return <LanguageIcon fontSize="small" />;
      case "video":
        return <VideoLibraryIcon fontSize="small" />;
      default:
        return <ChatIcon fontSize="small" />;
    }
  };

  // Get mode display name
  const getModeDisplayName = (mode: string) => {
    switch (mode) {
      case "general":
        return "General Assistant";
      case "writing":
        return "Writing Assistant";
      case "coding":
        return "Coding Assistant";
      case "pdf":
        return "PDF Analyzer";
      case "web":
        return "Web Analyzer";
      default:
        return "Assistant";
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          minWidth: "350px",
          width: "100%",
          position: "relative",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            width: "100%",
          }}
        >
          <Toolbar
            sx={{
              minHeight: "64px",
              display: "flex",
              width: "100%",
              px: { xs: 2, sm: 3 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexGrow: 1,
              }}
            >
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 600,
                  background: " #5ce1e6",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                CLAIRE
              </Typography>
            </Box>

            {/* Mode selector button */}
            <Box sx={{ position: "relative" }} ref={modeMenuRef}>
              {/* <Button
                onClick={toggleModeMenu}
                startIcon={getModeIcon(activeMode)}
                endIcon={<Box component="span" sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  transition: 'transform 0.2s',
                  transform: showModeMenu ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  <ArrowDropDownIcon />
                </Box>}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: 'rgba(37, 26, 26, 0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'text.primary',
                  px: 2,
                  py: 1,
                  mr: 1.5,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  },
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {getModeDisplayName(activeMode)}
              </Button> */}

              {/* Mode selection menu */}
              {showModeMenu && (
                <Paper
                  elevation={3}
                  sx={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    mt: 1,
                    width: 220,
                    borderRadius: 2,
                    overflow: "hidden",
                    zIndex: 1300,
                    backgroundColor: "background.paper",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Box sx={{ p: 1.5, pb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600, px: 1 }}
                    >
                      ASSISTANTS
                    </Typography>
                    <List dense sx={{ pt: 0.5 }}>
                      <ListItem
                        button
                        onClick={() => handleModeSelect("general")}
                        selected={activeMode === "general"}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <ChatIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="General Assistant" />
                      </ListItem>
                      <ListItem
                        button
                        onClick={() => handleModeSelect("writing")}
                        selected={activeMode === "writing"}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <ChatIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Writing Assistant" />
                      </ListItem>
                      <ListItem
                        button
                        onClick={() => handleModeSelect("coding")}
                        selected={activeMode === "coding"}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <ChatIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Coding Assistant" />
                      </ListItem>
                    </List>
                  </Box>

                  <Box sx={{ p: 1.5, pt: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600, px: 1 }}
                    >
                      ANALYZERS
                    </Typography>
                    <List dense sx={{ pt: 0.5 }}>
                      <ListItem
                        button
                        onClick={() => handleModeSelect("pdf")}
                        selected={activeMode === "pdf"}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <DescriptionIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="PDF Analyzer" />
                      </ListItem>
                      <ListItem
                        button
                        onClick={() => handleModeSelect("web")}
                        selected={activeMode === "web"}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <LanguageIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Web Analyzer" />
                      </ListItem>
                      <ListItem
                        button
                        onClick={() => handleModeSelect("video")}
                        selected={activeMode === "video"}
                        sx={{ borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <VideoLibraryIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Video Summarizer" />
                      </ListItem>
                    </List>
                  </Box>
                </Paper>
              )}
            </Box>

            <IconButton
              onClick={() => window.close()}
              sx={{
                ml: 1,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <IconButton
              color="secondary"
              onClick={handleSettingsToggle}
              sx={{
                ml: 1,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </AppBar>

        {showSettings ? (
          <Box
            sx={{ p: 3, flexGrow: 1, backgroundColor: "background.default" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  backgroundColor: "rgba(82, 113, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary.main",
                  mr: 2,
                }}
              >
                <SettingsIcon />
              </Box>
              <Typography variant="h6" fontWeight={600} color="text.primary">
                LM Studio API Settings
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your connection to LM Studio API to enable AI
              capabilities.
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                mb: 3,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Connection Settings
              </Typography>

              <TextField
                fullWidth
                label="API URL"
                variant="outlined"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                margin="normal"
                helperText="The URL of your LM Studio API server"
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                }}
              />

              <TextField
                fullWidth
                label="Model Name"
                variant="outlined"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                margin="normal"
                helperText="The name of your local model in LM Studio"
                sx={{
                  mb: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                }}
              />
            </Paper>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() => setShowSettings(false)}
                sx={{
                  mr: 2,
                  borderRadius: "12px",
                  px: 3,
                  py: 1.2,
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "text.primary",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.3)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveSettings}
                sx={{
                  borderRadius: "12px",
                  px: 3,
                  py: 1.2,
                  boxShadow: "0 4px 10px rgba(82, 113, 255, 0.2)",
                  "&:hover": {
                    boxShadow: "0 6px 15px rgba(82, 113, 255, 0.3)",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                Save Settings
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              flexGrow: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Chat initialMode={activeMode} />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<Popup />);
