import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { RemoteManagementConnection } from "./RemoteManagementConnection";
import { EdgeImpulseSettings } from "./Models";
import { SettingsForm } from "./SettingsForm";

interface AppProps {}
interface AppState {
  settings: EdgeImpulseSettings | undefined;
}

export class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      settings: undefined
    };
  }

  updateSettings = (settings: EdgeImpulseSettings) => {
    this.setState({
      settings: settings
    });
  };

  render() {
    const { settings } = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </header>
        {settings === undefined ? (
          <SettingsForm updateSettings={this.updateSettings}></SettingsForm>
        ) : (
          <RemoteManagementConnection
            settings={settings}
          ></RemoteManagementConnection>
        )}
      </div>
    );
  }
}
