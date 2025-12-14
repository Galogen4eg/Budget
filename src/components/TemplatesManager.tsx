import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button, 
  Box,
  Typography
} from '@mui/material';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  participantIds: string[];
  isTemplate: boolean;
  templateName?: string;
}

interface TemplatesManagerProps {
  templates: CalendarEvent[];
  onRowClick: (template: CalendarEvent) => void;
}

const TemplatesManager: React.FC<TemplatesManagerProps> = ({ 
  templates, 
  onRowClick 
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Шаблоны событий
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => onRowClick({
            id: 'new',
            title: '',
            start: new Date(),
            end: new Date(),
            participantIds: [],
            isTemplate: true
          })}
          sx={{ textTransform: 'none' }}
        >
          Добавить
        </Button>
      </Box>
      
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
              <TableCell>Название</TableCell>
              <TableCell>Участники</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow 
                key={template.id} 
                hover 
                onClick={() => onRowClick(template)}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f0f7ff' } }}
              >
                <TableCell>{template.title}</TableCell>
                <TableCell>{template.participantIds.length} участников</TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ fontStyle: 'italic', color: '#999' }}>
                  Нет шаблонов
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TemplatesManager;