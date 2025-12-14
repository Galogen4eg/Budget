import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';

interface DangerButtonProps {
  label: string;
  onConfirm: () => void;
  confirmationText: string;
}

const DangerButton: React.FC<DangerButtonProps> = ({ label, onConfirm, confirmationText }) => {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  return (
    <>
      <Button 
        variant="outlined" 
        color="error" 
        onClick={handleClickOpen}
        sx={{ textTransform: 'none' }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {label}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {confirmationText}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button onClick={handleConfirm} color="error" autoFocus>
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DangerButton;