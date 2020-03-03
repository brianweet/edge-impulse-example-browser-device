import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { RemoteManagementConnection } from "./RemoteManagementConnection";
import { EdgeImpulseSettings } from "./Models";
import { SettingsForm } from "./SettingsForm";
import { storeApiKey, storeDeviceId } from "./utils";

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
    storeApiKey(settings.apiKey);
    storeDeviceId(settings.device.deviceId);

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
          <>
            <h3>Device ID: {settings.device.deviceId}</h3>
            <RemoteManagementConnection
              settings={settings}
            ></RemoteManagementConnection>
          </>
        )}
      </div>
    );
  }
}
