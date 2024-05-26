import React, { useState } from 'react';
import Mails from './mails';
import Accounts from './accounts';
import { Button, Box } from '@mui/material';

function MainPage() {
  const [currentPage, setCurrentPage] = useState('mails');

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <Box padding={4} bgcolor="#f9f9f9" height="100vh">
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        marginBottom={2}
      >
        <Box>
          <Button
            variant={currentPage === 'mails' ? 'contained' : 'outlined'}
            onClick={() => handlePageChange('mails')}
            size="large"
            sx={{ marginRight: 2 }}
          >
            Mails
          </Button>
          <Button
            variant={currentPage === 'link-account' ? 'contained' : 'outlined'}
            onClick={() => handlePageChange('link-account')}
            size="large"
          >
            Link Email Client
          </Button>
        </Box>
      </Box>
      {currentPage === 'mails' && <Mails />}
      {currentPage === 'link-account' && <Accounts />}
    </Box>
  );
}

export default MainPage;
