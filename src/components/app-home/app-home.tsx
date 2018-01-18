import { Component } from '@stencil/core';
import { Device } from '../../sdr/device';
import Demodulator from 'mode-s-demodulator';
import { Buffer } from 'buffer';

const demodulator = new Demodulator()


@Component({
  tag: 'app-home',
  styleUrl: 'app-home.scss'
})
export class AppHome {

  async connect() {
    const device = new Device();
    await device.connect();

    await device.setAutoGain();
    await device.setCentralFreq(1090000000);
    await device.setSampleRate(2000000);
    await device.resetBuffer();

    while(true) {
      const data = await device.readData();
      const buf = Buffer.from(data.buffer);
      demodulator.process(buf, data.byteLength, onMsg);
    }
  }

  render() {
    return (
      <div>
        <p>
          Welcome to the Stencil App Starter.
          You can use this starter to build entire apps all with
          web components using Stencil!
          Check out our docs on <a href='https://stenciljs.com'>stenciljs.com</a> to get started.
        </p>
        <button onClick={()=>this.connect()}>Connect</button>
      </div>
    );
  }
}

function onMsg (msg) {
  console.log(msg);
}
