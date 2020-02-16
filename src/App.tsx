import React from "react";
import logo from "./logo.svg";
import "./App.css";
import axios from "axios";
import {
  sampleProcessing,
  sampleRequestReceived,
  sampleFinished,
  sampleUploading,
  dataMessage,
  DataMessage,
  helloMessage,
  sampleRequestFailed
} from "./messages";
import { parseMessage, createSignature, takeSample } from "./utils";
import { REMOTE_MANAGEMENT_ENDPOINT, INGESTION_API } from "./constants";

interface AppProps {}
interface AppState {
  socketConnected: boolean;
  remoteManagementConnected: boolean;
  error: string | null;
  sample: {
    label: string;
    length: number;
    path: string;
    hmacKey: string;
    interval: number;
    sensor: string;
  };
}

export class App extends React.Component<AppProps, AppState> {
  socket: WebSocket;
  apiKey: string;
  constructor(props: AppProps) {
    super(props);
    this.state = {
      socketConnected: false,
      remoteManagementConnected: false,
      error: null,
      sample: {
        label: "wave",
        length: 10000,
        path: "/api/training/data",
        hmacKey: "",
        interval: 16,
        sensor: "Built-in accelerometer"
      }
    };
    this.socket = new WebSocket(REMOTE_MANAGEMENT_ENDPOINT);
    const apiKey = new URLSearchParams(window.location.search).get("apiKey");
    if (!apiKey) {
      throw "Pass in your api key as query string param '?apiKey=your-key'";
    }
    this.apiKey = apiKey;
  }

  componentDidMount() {
    this.socket.onopen = _e => {
      this.setState({
        socketConnected: true
      });
      this.socket.send(JSON.stringify(helloMessage(this.apiKey)));
    };

    this.socket.onmessage = async event => {
      const data = await parseMessage(event);
      if (!data) {
        return;
      }

      if (data["hello"] !== undefined) {
        const msg = data["hello"];
        this.setState({
          remoteManagementConnected: msg.hello,
          error: msg.error
        });
      }
      if (data["sample"] !== undefined) {
        this.socket.send(JSON.stringify(sampleRequestReceived));
        const msg = data["sample"];
        this.setState({
          sample: {
            ...this.state.sample,
            ...msg
          }
        });
        this.socket.send(JSON.stringify(sampleProcessing));
        this.startSampling();
      }
    };

    this.socket.onclose = event => {
      if (event.wasClean) {
        alert(
          `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
        );
      } else {
        // e.g. server process killed or network down
        // event.code is usually 1006 in this case
        alert("[close] Connection died");
      }
    };

    this.socket.onerror = error => {
      alert(`[error] ${error}`);
    };
  }

  startSampling = async () => {
    const sample = await takeSample({ length: this.state.sample.length });
    if (sample.length <= 0) {
      this.socket.send(JSON.stringify(sampleRequestFailed("Was not able to capture any measurements")));
    } else {
      await this.sendData(dataMessage(sample));
    }
  };

  sendData = async (data: DataMessage) => {
    try {
      // Sign it please
      data.signature = await createSignature(this.state.sample.hmacKey, data);
      this.socket.send(JSON.stringify(sampleUploading));
      await axios({
        url: INGESTION_API + this.state.sample.path,
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "x-file-name": this.state.sample.label,
          "Content-Type": "application/json"
        },
        data: data
      });
      this.socket.send(JSON.stringify(sampleFinished));
    } catch (e) {
      alert(JSON.stringify(e));
    }
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}
