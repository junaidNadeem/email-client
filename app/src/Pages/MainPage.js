import React, { useState } from 'react';
import Mails from './Mails';
import Accounts from './Accounts';

function MainPage() {
  const [currentPage, setCurrentPage] = useState('mails');

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  return (
    <div>
      <div>
        <button onClick={() => handlePageChange('mails')}>Mails</button>
        <button onClick={() => handlePageChange('link-account')}>Link Account</button>
      </div>
      {currentPage === 'mails' && <Mails/>}
      {currentPage === 'link-account' && (
        <Accounts/>
      )}
    </div>
  );
}

export default MainPage;