import {
  AuthorsIcon,
  PlaceholderAuditIcon,
  PlaceholderSettingsIcon,
  PlaceholderWorksIcon,
  TagIcon,
  UserListIcon,
} from './icons';

const pageTitles = {
  tagList: '标签管理',
  userList: '用户列表',
  authorList: '作者标签管理',
  authorDetail: '操作详情',
};

export default function AppLayout({ page, onNavigate, children }) {
  const title = pageTitles[page] || page;
  const authorSectionActive = page === 'authorList' || page === 'authorDetail';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">L</div>
          <span className="sidebar-logo-text">LibTV Admin</span>
        </div>

        <nav className="sidebar-menu">
          <div className="sidebar-section">用户管理</div>
          <div
            className={`sidebar-item ${page === 'userList' ? 'active' : ''}`}
            onClick={() => onNavigate('userList')}
          >
            <UserListIcon />
            用户列表
          </div>

          <div className="sidebar-section">内容运营</div>
          <div className="sidebar-item disabled">
            <PlaceholderWorksIcon />
            作品管理
          </div>
          <div className="sidebar-item disabled">
            <PlaceholderAuditIcon />
            社区审核
          </div>

          <div className="sidebar-section">作者标签</div>
          <div className={`sidebar-item ${page === 'tagList' ? 'active' : ''}`} onClick={() => onNavigate('tagList')}>
            <TagIcon />
            标签管理
          </div>
          <div
            className={`sidebar-item ${authorSectionActive ? 'active' : ''}`}
            onClick={() => onNavigate('authorList')}
          >
            <AuthorsIcon />
            作者标签
          </div>

          <div className="sidebar-section">系统</div>
          <div className="sidebar-item disabled">
            <PlaceholderSettingsIcon />
            系统设置
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-avatar">运</div>
          <div>
            <div className="sidebar-user">运营A</div>
            <div className="sidebar-role">内容运营组</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <span className="header-title">{title}</span>
          <span className="header-breadcrumb">
            {page === 'userList' ? '用户管理' : '作者标签'} / <span>{title === '作者标签管理' ? '作者标签' : title}</span>
          </span>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
