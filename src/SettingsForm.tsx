import React from "react";
import { EdgeImpulseSettings } from "./Models";
import { getDeviceId, getApiKey } from "./utils";

interface SettingsFormProps {
  updateSettings: (settings: EdgeImpulseSettings) => void;
}
export class SettingsForm extends React.Component<
  SettingsFormProps,
  EdgeImpulseSettings & { error: string }
> {
  constructor(props: SettingsFormProps) {
    super(props);
    this.state = {
      apiKey: getApiKey(),
      device: {
        deviceId: getDeviceId(),
        deviceType: "BROWSER_CLIENT",
        accelerometerInterval: 16
      },
      error: ""
    };
    this.initAccelerometer();
  }

  initAccelerometer() {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      (DeviceMotionEvent as any)
        .requestPermission()
        .then((response: string) => {
          if (response == "granted") {
            this.setState({
              error: ""
            });
          } else {
            this.setState({
              error: "Device motion permissions denied"
            });
          }
        })
        .catch(() => {
          this.setState({
            error: "Failed to request device motion permissions"
          });
        });
    }
  }

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    this.setState({
      ...this.state,
      [event.target.name]: value
    });
  };
  handleDeviceSettingsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    this.setState({
      device: {
        ...this.state.device,
        [event.target.name]: value
      }
    });
  };

  render() {
    const { apiKey, device } = this.state;
    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          this.props.updateSettings(this.state);
        }}
      >
        <label>
          Edge Impulse API key
          <input
            type="text"
            name="apiKey"
            placeholder="see portal, ei_..."
            onChange={this.handleChange}
            value={apiKey}
            required
          />
        </label>
        <label>
          Device ID
          <input
            type="text"
            name="deviceId"
            placeholder="e.g. iPhone, Galaxy"
            onChange={this.handleDeviceSettingsChange}
            value={device.deviceId}
            required
          />
        </label>
        <label>
          Accelerometer interval (in ms)
          <input
            type="number"
            name="accelerometerInterval"
            placeholder="Acc. Interval (in ms, e.g. 16)"
            onChange={this.handleDeviceSettingsChange}
            value={device.accelerometerInterval}
            required
            disabled
          />
        </label>
        {this.state.error ? (
          <button
            onClick={e => {
              e.preventDefault();
              this.initAccelerometer();
            }}
          >
            Request permissions
          </button>
        ) : (
          <input type="submit" value="Submit" />
        )}
      </form>
    );
  }
}
