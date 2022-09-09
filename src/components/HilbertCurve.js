import React from "react";

import * as Constants from "../Constants.js"

import './HilbertCurve.css';

class HilbertCurve extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hcKey: 0,
      database: this.props.database,
      cSamples: null,
    };
    this.hilbertCurveRef = React.createRef();
  }

  componentDidMount() {
    setTimeout(() => {
      this.updateHcData();
    }, Constants.updateHcDataRefreshTime);
  }

  updateHcData = async () => {
    try {
      if (this.state.database && this.state.database.hilbertCurves) {
        // console.log(`(HC) testing for data at [${this.props.storageKey}]`);
        // const cSamples = await this.state.database.hilbertCurves.where({'name' : this.props.storageKey}).toArray();
        const cSamplesKeys = await this.state.database.hilbertCurves.where({'name' : this.props.storageKey}).primaryKeys();
        if (cSamplesKeys.length > 0) {
          const cSamples = await this.state.database.hilbertCurves.where({'name' : this.props.storageKey}).toArray();
          // console.log(`(HC) cSamples ${JSON.stringify(cSamples[0])}`);
          let newCSamples = cSamples[0];
          const newHcKey = this.state.hcKey + 1;
          this.setState({
            hcKey: newHcKey,
            cSamples: newCSamples,
          }, () => {
            // console.log(`(HC) retrieved cSamples: ${JSON.stringify(this.state.cSamples)}`);
          });
        }
        else {
          throw new Error("Cannot retrieve cSamples from db.hilbertCurves table!");
        }
      }
    }
    catch (err) {
      console.log(`Error - ${JSON.stringify(err.message)}`);
    }
  }
  
  render() {
    // console.log(`dimensions ${JSON.stringify(this.props.dimensions)}`);
    return (
      <div key={this.state.hcKey} ref={this.hilbertCurveRef} className="hc-parent" id="hc-parent">
        <div className="hc-canvas" id="hc-canvas">
          <div className="hc-canvas-container">
            <div className="hc-canvas-container-center">
              Canvas
            </div>
          </div>
        </div>
        {(this.state.cSamples) ? 
          <div className="hc-debug-info" id="hc-debug-info">
            <div className="hc-debug-info-header">
              Debug
            </div>
            <div className="hc-debug-info-body">
              <div>
                <span className="hc-debug-info-label">Storage key:</span> <span className="hc-debug-info-value">{this.props.storageKey}</span>
              </div>
              <div>
                <span className="hc-debug-info-label">Storage operation time:</span> <span className="hc-debug-info-value">{this.props.storageOperationTime.toFixed(2)} ms</span>
              </div>
              <div>
                <span className="hc-debug-info-label">Hilbert curve coords:</span> <span className="hc-debug-info-value">{(this.props.storageRetrievedFromCache) ? "Retrieved from cache" : "Calculated via d3-hilbert calls"}</span>
              </div>
              <div>
                <span className="hc-debug-info-label">Curve order:</span> <span className="hc-debug-info-value">{this.props.settings.sampleOrder}</span>
              </div>
              <div>
                <span className="hc-debug-info-label">Coords array length:</span> <span className="hc-debug-info-value">{(this.state.cSamples.data) ? this.state.cSamples.data.length : 0}</span>
              </div>
            </div>
          </div>
        :
          <div />
        }
      </div>
    )
  }
}
  
export default HilbertCurve;