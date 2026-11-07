import React from 'react';
import { Route, Switch, Router } from 'wouter';
// Must use hash mode, useHashLocation export from "wouter/use-hash-location", not direct import from "wouter"
import { useHashLocation } from 'wouter/use-hash-location';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import CreateActivity from './pages/CreateActivity';
import ActivityDetail from './pages/ActivityDetail';
import Kiosk from './pages/Kiosk';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/create" component={CreateActivity} />
        <Route path="/activity/:id" component={ActivityDetail} />
        <Route path="/kiosk" component={Kiosk} />
        <Route component={NotFound} />
      </Switch>
      <Toaster position="top-center" richColors />
    </Router>
  );
}

