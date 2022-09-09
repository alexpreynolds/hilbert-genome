import React from "react";

import DatGui, { DatSelect, DatFolder, DatNumber, DatButton } from 'react-dat-gui';
import './react-dat-gui.css';

import * as d3 from "d3";

import Dexie from 'dexie';

import { debounce } from 'debounce';

import HilbertCurve from "./HilbertCurve";

import * as Helpers from "../Helpers.js";
import * as Constants from "../Constants.js";
import './Viewer.css';

class Viewer extends React.Component {
  constructor(props) {
    super(props);

    const chromosomes = Helpers.chromosomes(Constants.chromosomeSizes);
    const chromosomeSize = d3.sum(chromosomes, d => d.size);
    const db = new Dexie(Constants.storageDatabaseName);
    db.version(1).stores({
      hilbertCurves: '&name, data'
    });
    db.open();
    // db.tables.forEach(t => console.log(`db tbl ${JSON.stringify(t.name)}`));
    const initialStorageKey = Helpers.storageKeyByParams({
      markType: Constants.defaultMarkType, 
      sampleOrder: Constants.defaultSampleOrder,
    });

    this.state = {
      database: db,
      settings: {
        markType: Constants.defaultMarkType,
        sampleOrder: Constants.defaultSampleOrder,
      },
      hcKey: 0,
      hcDimensions: {
        width: 0,
        height: 0,
      },
      hcData: null,
      storageKey: initialStorageKey,
      storageOperationTime: 0,
      storageRetrievedFromCache: false,
      chromosomes: chromosomes,
      chromosomeSize: chromosomeSize,
      baseOrder: Math.log(chromosomeSize) / Math.log(4),
      viewOrder: Constants.defaultSampleOrder,
      totalSamples: 8192 * Constants.defaultSampleOrder,
    };

    this.hilbertCurveRef = React.createRef();

    this.updateHcData();
  }

  componentDidMount() {
    window.addEventListener("resize", this.updateDimensions);
    this.updateDimensions();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateDimensions);
  }

  updateDimensions = debounce((e) => {
    const newHcDimensions = {
      width: this.hilbertCurveRef.current.clientWidth,
      height: this.hilbertCurveRef.current.clientHeight,
    };
    this.setState({
      hcDimensions: newHcDimensions,
    });
  }, Constants.updateDimensionsResizeTime);

  updateHcData = debounce(async () => {
    // console.log(`cSamples (true) ${JSON.stringify(cSamples)}`);
    try {
      if (this.state.database && this.state.database.hilbertCurves) {
        const db = this.state.database.hilbertCurves;
        const queryStart = performance.now();
        // const currentHCData = await db.where({'name' : this.state.storageKey}).toArray();
        const currentHCDataKeys = await db.where({'name' : this.state.storageKey}).primaryKeys();
        const queryEnd = performance.now();
        if (currentHCDataKeys.length === 0) {
          // console.log(`adding cSamples to [${this.state.storageKey}]`);
          const cSamples = Helpers.makeChromosomeSamples({
            baseOrder: this.state.baseOrder,
            viewOrder: this.state.viewOrder,
            totalSamples: this.state.totalSamples,
            chroms: this.state.chromosomes,
            chromsSize: this.state.chromosomeSize,
          });
          const newHCData = cSamples;
          const addStart = performance.now();
          await db.add({
            name: this.state.storageKey,
            data: newHCData,
          });
          const addEnd = performance.now();
          this.setState({
            storageOperationTime: (queryEnd - queryStart) + (addEnd - addStart),
            storageRetrievedFromCache: false,
          });
        }
        else {
          // console.log(`cSamples already at [${this.state.storageKey}]}`);
          this.setState({
            storageOperationTime: queryEnd - queryStart,
            storageRetrievedFromCache: true,
          });
        }
        if (this.state.hcDimensions.width > 0 && this.state.hcDimensions.height > 0) {
          // console.log(`Updating HC...`);
          const newHilbertCurveKey = this.state.hcKey + 1;
          this.setState({
            hcKey: newHilbertCurveKey,
          });
        }
      }
      else {
        throw new Error("Storage database unavailable!");
      }
    }
    catch (err) {
      console.log(`Error - ${JSON.stringify(err.message)}`);
    }
  }, Constants.updateHcDataRefreshTime);

  handleControlPanelUpdate = newData => {
    // ensure bounds
    newData.sampleOrder = (newData.sampleOrder >= Constants.sampleOrderStart && newData.sampleOrder <= Constants.sampleOrderStop) ? newData.sampleOrder : Constants.defaultSampleOrder;
    this.setState(prevState => ({
      settings: { ...prevState.settings, ...newData }
    }), () => {
      const newStorageKey = Helpers.storageKeyByParams({ 
        markType: newData.markType, 
        sampleOrder: newData.sampleOrder
      });
      // console.log(`newData ${JSON.stringify(newData)}`);
      // console.log(`newStorageKey ${newStorageKey}`);
      this.setState({
        viewOrder: newData.sampleOrder,
        totalSamples: 8192 * newData.sampleOrder,
        storageKey: newStorageKey,
      }, () => {
        // console.log(`new storage key: ${this.state.storageKey}`)
        if (this.state.hcDimensions.width > 0 && this.state.hcDimensions.height > 0) {
          this.updateHcData();
        }
      });
    });
  }

  handleHilbertCurveUpdate = newData => {}

  handleRefreshIndexedDB = (e) => {
    const db = this.state.database;
    try {
      db.delete()
        .then(() => {
          // console.log("Database successfully deleted!");
          db.version(1).stores({
            hilbertCurves: '&name, data',
          });
          db.open();
          if (this.state.hcDimensions.width > 0 && this.state.hcDimensions.height > 0) {
            this.updateHcData();
          }
        })
        .catch((err) => {
          throw new Error("Could not delete database!");
        });
    }
    catch (err) {
      console.log(`Error - ${JSON.stringify(err.message)}`);
    }
  }

  render() {

    const { settings, hcDimensions } = this.state;

    const datGuiStyle = {
      top: '18px',
      paddingRight: '4px',
    };

    return (
      <div className="viewer" id="viewer">
        <div className="viewer-header" id="viewer-header">
          <div className="viewer-header-name" id="viewer-header-name">
            {Constants.applicationName}
          </div>
          <div className="viewer-header-controlPanel" id="viewer-header-controlPanel">
            <DatGui style={datGuiStyle} data={settings} onUpdate={this.handleControlPanelUpdate}>
              <DatFolder title='Settings' closed={true}>
                <DatSelect path='markType' options={Constants.markTypes} label='Type' />
                <DatNumber path='sampleOrder' label='Sample order' min={Constants.sampleOrderStart} max={Constants.sampleOrderStop} step={1} />
                <DatButton label='Refresh cache' onClick={this.handleRefreshIndexedDB} />
              </DatFolder>
            </DatGui>
          </div>
        </div>
        <div ref={this.hilbertCurveRef} className="viewer-content" id="viewer-content">
          { (hcDimensions.width > 0 && hcDimensions.height > 0) ? 
            <HilbertCurve 
              key={this.state.hcKey}
              database={this.state.database}
              storageKey={this.state.storageKey}
              storageOperationTime={this.state.storageOperationTime}
              storageRetrievedFromCache={this.state.storageRetrievedFromCache}
              settings={settings} 
              onUpdate={this.handleHilbertCurveUpdate}
              dimensions={hcDimensions}
            />
            :
            <div />
          }
        </div>
      </div>
    );
  }
}

export default Viewer;