import { useState } from 'react';
import AppLayout from './components/AppLayout';
import ToastContainer from './components/ToastContainer';
import { initialTags, mockAuthors, mockUsers } from './data/mockData';
import AuthorDetailPage from './pages/AuthorDetailPage';
import AuthorTagPage from './pages/AuthorTagPage';
import TagManagementPage from './pages/TagManagementPage';
import UserListPage from './pages/UserListPage';

let toastId = 0;

export default function App() {
  const [page, setPage] = useState('userList');
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  const [tags, setTags] = useState(initialTags);
  const [authors, setAuthors] = useState(mockAuthors);
  const [toasts, setToasts] = useState([]);

  const selectedAuthor = selectedAuthorId
    ? authors.find((author) => author.authorId === selectedAuthorId)
    : null;

  function addToast(type, message) {
    const id = ++toastId;
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }

  function handleNavigate(nextPage) {
    setPage(nextPage);
    if (nextPage !== 'authorDetail') {
      setSelectedAuthorId(null);
    }
  }

  return (
    <>
      <AppLayout page={page} onNavigate={handleNavigate}>
        {page === 'userList' ? (
          <UserListPage users={mockUsers} addToast={addToast} />
        ) : page === 'tagList' ? (
          <TagManagementPage tags={tags} setTags={setTags} addToast={addToast} />
        ) : page === 'authorDetail' ? (
          <AuthorDetailPage
            author={selectedAuthor}
            tags={tags}
            onBack={() => handleNavigate('authorList')}
            addToast={addToast}
          />
        ) : (
          <AuthorTagPage
            tags={tags}
            authors={authors}
            setAuthors={setAuthors}
            addToast={addToast}
            onViewDetail={(author) => {
              setSelectedAuthorId(author.authorId);
              setPage('authorDetail');
            }}
          />
        )}
      </AppLayout>
      <ToastContainer toasts={toasts} />
    </>
  );
}
