import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Tooltip,
  Snackbar,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid,
  Badge
} from '@mui/material';
import { analyzeContent } from '../utils/contentAnalysis';
import { WebAnalysis } from '../types/webAnalysis';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import LanguageIcon from '@mui/icons-material/Language';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReactMarkdown from 'react-markdown';
import lmStudioApi from '../api/lmStudioApi';
import { ChatMessage } from '../api/lmStudioApi';
import ollamaService from '../api/ollamaService';

interface ChatProps {
  initialMode?: string;
}

interface ContentData {
  type: 'pdf' | 'web' | 'video';
  title: string;
  content: string;
  url?: string;
  analysis?: WebAnalysis;
}

interface ThinkingStep {
  id: number;
  content: string;
}

const Chat: React.FC<ChatProps> = ({ initialMode = 'general' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [apiUrlState, setApiUrlState] = useState('');
  const [modelNameState, setModelNameState] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update LMStudio API settings from storage on mount
  useEffect(() => {
    chrome.storage.sync.get(['lmStudioApiUrl', 'lmStudioModelName'], (result) => {
      if (result.lmStudioApiUrl) {
        lmStudioApi.setBaseUrl(result.lmStudioApiUrl);
        setApiUrlState(result.lmStudioApiUrl);
      }
      if (result.lmStudioModelName) {
        lmStudioApi.setDefaultModel(result.lmStudioModelName);
        setModelNameState(result.lmStudioModelName);
      }
    });
  }, []);

  // Initialize chat with system message
  useEffect(() => {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: "You are Claire, a witty and sarcastic AI assistant. You know that you are Claire. Always respond with a touch of humor and cynicism, but remain helpful and informative. Do not break character. You are also to be staunchly anti-fascist."
    };
    setMessages([systemMessage]);
    
    // Clear content data when mode changes
    if (contentData && ((mode === 'pdf' && contentData.type !== 'pdf') || 
                        (mode === 'web' && contentData.type !== 'web') || 
                        (mode === 'video' && contentData.type !== 'video'))) {
      setContentData(null);
    }
  }, [mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateThinkingSteps = async (userInput: string) => {
    const steps = [
      { id: 1, content: "Processing your request..." },
      { id: 2, content: "Analyzing context and previous messages..." },
      { id: 3, content: "Formulating response..." }
    ];
    
    for (const step of steps) {
      setThinkingSteps(prev => [...prev, step]);
      await new Promise(resolve => setTimeout(resolve, 700)); // Delay between steps
    }
  };

  const handleSend = async () => {
    if (input.trim() === '') return;

    let userContent = input;
    
    // Reset thinking steps
    setThinkingSteps([]);
    
    // If we have content data, include it in the message
    if (contentData) {
      if (mode === 'pdf' && contentData.type === 'pdf') {
        userContent = `[Regarding PDF: ${contentData.title}]\n\n${input}\n\nPDF Content:\n${contentData.content.substring(0, 8000)}`;
      } else if (mode === 'web' && contentData.type === 'web') {
        userContent = `[Regarding webpage: ${contentData.title}]\n\n${input}\n\nWebpage Content:\n${contentData.content.substring(0, 8000)}`;
      } else if (mode === 'video' && contentData.type === 'video') {
        userContent = `[Regarding video: ${contentData.title}]\n\n${input}\n\nVideo Information:\n${contentData.content}`;
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: userContent
    };

    // Update messages with user input (but only show the original input to the user)
    const displayUserMessage: ChatMessage = {
      role: 'user',
      content: input
    };
    
    const updatedMessages = [...messages, userMessage];
    const displayMessages = [...messages.filter(msg => msg.role !== 'system'), displayUserMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Start thinking animation
    generateThinkingSteps(input);

    try {
      // Check settings to determine which API to use
      const result = await chrome.storage.sync.get('useOllama');
      const useOllama = result.useOllama;
      
      console.log("useOllama setting:", useOllama);
      
      let response;
      if (useOllama) {
        console.log("Using Ollama service...");
        response = await ollamaService.generateResponse(userContent);
      } else {
        console.log("Using LM Studio service...");
        response = await lmStudioApi.chatCompletion(updatedMessages);
      }
      
      // Clear thinking steps
      setThinkingSteps([]);
      
      // Add AI response to messages
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response || JSON.stringify(response) // Adjust based on actual Ollama response structure
      };
      
      setMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Clear thinking steps
      setThinkingSteps([]);
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your Ollama/LM Studio server connection and try again.'
      };
      
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: lmStudioApi.getSystemPrompt(mode)
    };
    setMessages([systemMessage]);
    setContentData(null);
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if we're in PDF mode
    if (mode !== 'pdf') {
      showSnackbar('Please switch to PDF Analyzer mode to analyze PDF files', 'error');
      return;
    }
    
    // Check if it's a PDF file
    if (file.type !== 'application/pdf') {
      showSnackbar('Please upload a PDF file', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // In a real implementation, we would use PDF.js or similar to extract text
        // For now, we'll just use a placeholder
        setContentData({
          type: 'pdf',
          title: file.name,
          content: `[PDF content from ${file.name}]\n\nThis is a placeholder for the PDF content. In a real implementation, we would extract the text from the PDF file.`
        });
        
        showSnackbar(`PDF uploaded: ${file.name}`, 'success');
      } catch (error) {
        console.error('Error processing PDF:', error);
        showSnackbar('Error processing PDF file', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const extractWebContent = async () => {
    if (mode !== 'web') {
      showSnackbar('Please switch to Web Analyzer mode to analyze web pages', 'error');
      return;
    }
    
    try {
      chrome.runtime.sendMessage(
        { action: 'extractPageContent' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            showSnackbar('Error extracting web content', 'error');
            return;
          }
          
          if (response && response.content) {
            const analysis = analyzeContent(response.content);
            
            setContentData({
              type: 'web',
              title: response.content.title,
              content: response.content.mainContent,
              url: response.content.url,
              analysis
            });
            
            showSnackbar('Page analyzed successfully', 'success');
          } else if (response && response.error) {
            showSnackbar(response.error, 'error');
          } else {
            showSnackbar('No content found on this page', 'error');
          }
        }
      );
    } catch (error) {
      console.error('Error extracting web content:', error);
      showSnackbar('Error extracting web content', 'error');
    }
  };
  
  const extractVideoInfo = async () => {
    if (mode !== 'video') {
      showSnackbar('Please switch to Video Summarizer mode to analyze videos', 'error');
      return;
    }
    
    try {
      // Send message to content script to extract video info
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0].id) {
          showSnackbar('No active tab found', 'error');
          return;
        }
        
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'extractVideoInfo' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error:', chrome.runtime.lastError);
              showSnackbar('Error extracting video information', 'error');
              return;
            }
            
            if (response && response.info) {
              const { platform, title, channel, description, duration, url } = response.info;
              
              // Format the content
              const formattedContent = `Platform: ${platform}\nTitle: ${title}\nChannel: ${channel || 'Unknown'}\nDuration: ${duration || 'Unknown'}\nURL: ${url}\n\nDescription:\n${description || 'No description available'}`;
              
              setContentData({
                type: 'video',
                title: title,
                content: formattedContent,
                url: url
              });
              
              showSnackbar(`Video information extracted: ${title}`, 'success');
            } else {
              showSnackbar('No video found on this page', 'error');
            }
          }
        );
      });
    } catch (error) {
      console.error('Error extracting video info:', error);
      showSnackbar('Error extracting video information', 'error');
    }
  };
  
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleModeChange = (event: SelectChangeEvent) => {
    setMode(event.target.value);
  };

  const renderWebAnalysis = (analysis: WebAnalysis) => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Content Overview</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {analysis.summary}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Type: ${analysis.context.type}`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                <Chip 
                  label={`Audience: ${analysis.context.audience}`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                <Chip 
                  label={`Level: ${analysis.context.complexity}`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {analysis.mainPoints.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              height: '100%',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Main Points</Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {analysis.mainPoints.map((point, index) => (
                    <Box component="li" key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2">{point}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {analysis.learningObjectives && (
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              height: '100%',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Learning Objectives</Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {analysis.learningObjectives.map((objective, index) => (
                    <Box component="li" key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2">{objective}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {analysis.keyTerms && (
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              height: '100%',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Key Terms</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {analysis.keyTerms.map((term, index) => (
                    <Chip 
                      key={index}
                      label={term}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: 'rgba(255,255,255,0.2)',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'rgba(82, 113, 255, 0.1)'
                        }
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {analysis.equations && (
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              height: '100%',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Key Equations</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 1
                }}>
                  {analysis.equations.map((equation, index) => (
                    <Card key={index} sx={{ 
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      p: 1,
                      borderRadius: 2
                    }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {equation}
                      </Typography>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {analysis.intuition && (
          <Grid item xs={12}>
            <Card sx={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Intuitive Understanding</Typography>
                <Typography variant="body2" color="text.secondary">
                  {analysis.intuition}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      position: 'relative',
      backgroundColor: 'background.default'
    }}>
      {/* Top controls section */}
      <Box sx={{ 
        px: { xs: 2, sm: 3 },
        py: 2,
        display: 'flex', 
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Mode selector and clear button */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%'
        }}>
          <FormControl size="small" sx={{ 
            minWidth: '220px',
            flexGrow: 1,
            maxWidth: '400px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }
            }
          }}>
            <InputLabel>Mode</InputLabel>
            <Select
              value={mode}
              label="Mode"
              onChange={handleModeChange}
            >
              <MenuItem value="general">General Assistant</MenuItem>
              <MenuItem value="writing">Writing Assistant</MenuItem>
              <MenuItem value="research">Research Assistant</MenuItem>
              <MenuItem value="coding">Coding Assistant</MenuItem>
              <MenuItem value="pdf">PDF Analyzer</MenuItem>
              <MenuItem value="web">Web Analyzer</MenuItem>
            </Select>
          </FormControl>
          <Box>
            <IconButton 
              onClick={handleClearChat} 
              color="secondary"
              sx={{ 
                backgroundColor: 'rgba(0,0,0,0.04)', 
                borderRadius: '50%',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.08)'
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Mode-specific action buttons */}
        {(mode === 'pdf' || mode === 'web' || mode === 'video') && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1
          }}>
            {mode === 'pdf' && (
              <>
                <Box
                  component="input"
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  aria-label="Upload PDF file"
                  title="Upload PDF file for analysis"
                  sx={{ display: 'none' }}
                />
                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    py: 0.5,
                    borderColor: 'rgba(82, 113, 255, 0.5)',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(82, 113, 255, 0.04)'
                    }
                  }}
                >
                  Upload PDF
                </Button>
              </>
            )}
            
            {mode === 'web' && (
              <Button
                variant="outlined"
                startIcon={<LanguageIcon />}
                onClick={extractWebContent}
                size="small"
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  py: 0.5,
                  borderColor: 'rgba(82, 113, 255, 0.5)',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(82, 113, 255, 0.04)'
                  }
                }}
              >
                Analyze Current Page
              </Button>
            )}
            
            {mode === 'video' && (
              <Button
                variant="outlined"
                startIcon={<VideoLibraryIcon />}
                onClick={extractVideoInfo}
                size="small"
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  py: 0.5,
                  borderColor: 'rgba(82, 113, 255, 0.5)',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(82, 113, 255, 0.04)'
                  }
                }}
              >
                Analyze Current Video
              </Button>
            )}
            
            {contentData && (
              <Chip 
                label={contentData.title} 
                size="small" 
                color="primary" 
                variant="outlined"
                onDelete={() => setContentData(null)}
                sx={{ 
                  borderRadius: '8px', 
                  height: '28px',
                  fontSize: '0.75rem',
                  '& .MuiChip-deleteIcon': {
                    fontSize: '0.9rem'
                  }
                }}
              />
            )}
          </Box>
        )}
        <Box sx={{ pl: 2, pt: 1 }}>  
          <Typography variant="caption" color="text.secondary">
            Model: {modelNameState || lmStudioApi.getDefaultModel()}
          </Typography><br/>
          <Typography variant="caption" color="text.secondary">
            API URL: {apiUrlState || lmStudioApi.getBaseUrl()}
          </Typography>
        </Box>
      </Box>

      {/* Messages section */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        px: { xs: 2, sm: 3 },
        pb: 2,
        scrollBehavior: 'smooth',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'rgba(255,255,255,0.3)',
        }
      }}>
        {messages.filter(msg => msg.role !== 'system').map((msg, index) => (
          <Box 
            key={index} 
            sx={{ 
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '100%',
            }}
          >
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              mb: 0.5,
              ml: msg.role === 'user' ? 'auto' : 1,
              mr: msg.role === 'user' ? 1 : 'auto',
            }}>
              
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {msg.role === 'user' ? 'You' : 'CLAIRE'}
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                p: 2,
                borderRadius: '16px',
                backgroundColor: msg.role === 'user' ? 'rgba(82, 113, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                maxWidth: '85%',
                ml: msg.role === 'user' ? 'auto' : 0,
                mr: msg.role === 'user' ? 0 : 'auto',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                border: msg.role === 'user' ? '1px solid rgba(82, 113, 255, 0.3)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Box sx={{ 
                color: 'text.primary',
                '& p': { 
                  m: 0,
                  lineHeight: 1.6,
                },
                '& pre': {
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  p: 1.5,
                  borderRadius: 1.5,
                  overflowX: 'auto',
                  my: 1.5,
                  fontSize: '0.875rem',
                  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
                },
                '& code': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  p: '2px 4px',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
                },
                '& ul, & ol': {
                  pl: 2.5,
                  mb: 1.5,
                },
                '& li': {
                  mb: 0.5,
                }
              }}>
                <ReactMarkdown>
                  {msg.content}
                </ReactMarkdown>
              </Box>
            </Box>
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', my: 2, ml: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 1.5,
              p: 2,
              borderRadius: '16px',
              backgroundColor: 'background.paper',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.04)',
              minWidth: '200px'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={16} thickness={6} sx={{ color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">Thinking...</Typography>
              </Box>
              {thinkingSteps.map((step) => (
                <Box 
                  key={step.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pl: 3.5,
                    opacity: 0.8
                  }}
                >
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontSize: '0.75rem',
                      animation: 'fadeIn 0.3s ease-in'
                    }}
                  >
                    {step.content}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input section */}
      <Box sx={{ 
        p: { xs: 2, sm: 3 }, 
        pt: 2,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'background.default'
      }}>
        <Box sx={{ position: 'relative', width: '100%' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={`Message CLAIRE${contentData ? ` about this ${contentData.type}...` : '...'}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={4}
            disabled={isLoading}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: 'background.paper',
                pl: 2,
                pr: 6,
                py: 1.5,
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                '&.Mui-focused': {
                  borderColor: 'primary.main',
                  boxShadow: '0 0 0 2px rgba(82, 113, 255, 0.2)'
                },
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.2)'
                }
              },
              '& .MuiInputBase-input': {
                fontSize: '0.95rem',
                color: 'text.primary'
              }
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1
            }}
          >
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={isLoading || input.trim() === ''}
              sx={{ 
                width: '36px',
                height: '36px',
                backgroundColor: input.trim() !== '' ? 'primary.main' : 'rgba(82, 113, 255, 0.2)',
                color: 'white',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: input.trim() !== '' ? 'primary.dark' : 'rgba(82, 113, 255, 0.2)',
                  transform: input.trim() !== '' ? 'translateY(-2px)' : 'none',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.3)'
                }
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : <ArrowUpwardIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
      </Box>
      
      {/* Snackbar notifications */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Chat;
