import { Switch, Route } from 'wouter';
import HomePage from '@/pages/HomePage';
import MainApp from '@/pages/MainApp';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrgRoleProvider } from '@/contexts/OrgRoleContext';

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/app" component={MainApp} />
    </Switch>
  );
}

function App() {
  return (
    <Switch>
      <Route path="/">
        <HomePage />
      </Route>
      <Route path="/app">
        <AuthProvider>
          <OrgRoleProvider>
            <MainApp />
          </OrgRoleProvider>
        </AuthProvider>
      </Route>
    </Switch>
  );
}

export default App;
