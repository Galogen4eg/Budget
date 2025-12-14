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
  IconButton,
  Box,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface Participant {
  id: string;
  name: string;
  color: string;
}

interface ParticipantsManagerProps {
  participants: Participant[];
  onAdd: () => void;
  onEdit: (item: Participant) => void;
  onDelete: (id: string) => void;
}

const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({ 
  participants, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Участники
        </Typography>
        <Button 
          variant="outlined" 
          onClick={onAdd}
          sx={{ textTransform: 'none' }}
        >
          Добавить
        </Button>
      </Box>
      
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
              <TableCell>Имя</TableCell>
              <TableCell>Цвет</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((participant) => (
              <TableRow 
                key={participant.id} 
                hover 
                onClick={() => onEdit(participant)}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f0f7ff' } }}
              >
                <TableCell>{participant.name}</TableCell>
                <TableCell>
                  <Box 
                    sx={{ 
                      display: 'inline-block', 
                      width: 20, 
                      height: 20, 
                      backgroundColor: participant.color,
                      borderRadius: '50%',
                      border: '1px solid #ccc',
                      mr: 1
                    }}
                  />
                  {participant.color}
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(participant.id);
                    }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {participants.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ fontStyle: 'italic', color: '#999' }}>
                  Нет участников
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ParticipantsManager;