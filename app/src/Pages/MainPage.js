import React, { useState } from 'react';
import Mails from './Mails';
import Accounts from './Accounts';
import Button from '@mui/material/Button';

function MainPage() {
  const [currentPage, setCurrentPage] = useState('mails');

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  return (
    <div>
      <center>
      <div>
        <Button variant='contained' onClick={() => handlePageChange('mails')}>Mails</Button>
        <Button variant='contained' style={{marginLeft: 50}} onClick={() => handlePageChange('link-account')}>Link Account</Button>
      </div></center>
      {currentPage === 'mails' && <Mails/>}
      {currentPage === 'link-account' && (
        <Accounts/>
      )}
    </div>
  );
}

export default MainPage;