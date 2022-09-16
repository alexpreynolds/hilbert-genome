import React from "react";
import * as PixiUtils from '@pixi/utils';
import { Rectangle } from 'pixi.js';

import { Stage, Sprite, Container, Graphics, AppConsumer } from "@inlet/react-pixi";
import { debounce } from 'debounce';

import HilbertCurveViewport from "./HilbertCurveViewport";
import * as Constants from "../Constants.js";

import './HilbertCurveStage.css';

class HilbertCurveStage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hcKey: 0,
      database: this.props.database,
      cSamples: this.props.data,
      nCSamples: 0,
      hcRawDimension: Math.pow(2.0, this.props.settings.sampleOrder),
      hcScale: Constants.defaultLineScale,
      hcPadding: Constants.defaultHcPadding,
      // lineEnc: this.props.lineEnc,
    };
    this.hilbertCurveRef = React.createRef();
  }

  componentDidMount() {
    this.updateHcData();
    // setTimeout(() => {
    //   this.updateHcData();
    // }, Constants.updateHcDataRefreshTime);
  }

  updateHcData = async () => {
    console.log(`HilbertCurveStage - updateHcData`);
    try {
      if (this.state.database && this.state.database.hilbertCurves) {
        // console.log(`(HC) testing for data at [${this.props.storageKey}]`);
        // const cSamples = await this.state.database.hilbertCurves.where({'name' : this.props.storageKey}).toArray();
        const cSamplesKeys = await this.state.database.hilbertCurves.where({'name' : this.props.storageKey}).primaryKeys();
        if (cSamplesKeys.length > 0) {
          const cSamples = await this.state.database.hilbertCurves.where({'name' : this.props.storageKey}).toArray();
          // console.log(`(HC) cSamples ${JSON.stringify(cSamples[0])}`);
          let newCSamples = cSamples[0];
          // const newHcKey = this.state.hcKey + 1;
          // const newLineEnc = (newCSamples.lineEnc) ? newCSamples.lineEnc : null;
          this.setState({
            // hcKey: newHcKey,
            cSamples: newCSamples,
            nCSamples: newCSamples.data.length,
            // lineEnc: newLineEnc
          }, () => {
            // console.log(`(HC) retrieved cSamples: ${JSON.stringify(this.state.cSamples)}`);
            // console.log(`newLineEnc ${this.state.lineEnc}`);
            this.updateScale();
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

  drawGraphics = async (g, app) => {
    console.log(`HilbertCurveStage - drawGraphics`);

    // const { cSamples, lineEnc } = this.state;
    const { cSamples } = this.state;

    if ( !g || !cSamples || this.props.lineEnc ) return;

    g.position.set(0, 0);

    g.lineStyle({
      width: Constants.defaultLineWidth, 
      color: 0x000000,
      join: 'round',
      cap: 'square',
    });

    // console.log(`cSamples ${JSON.stringify(cSamples)}`);

    let previousX = -1;
    let previousY = -1;
    let previousName = "";
    cSamples.data.forEach((d) => {
      // console.log(`d ${JSON.stringify(d)}`);
      const [currentX, currentY, currentName] = [d.x * this.state.hcScale, d.y * this.state.hcScale, d.name];
      if (currentName !== previousName) {
        // console.log(`color: ${d.fill} | ${JSON.stringify(PixiUtils.string2hex(d.fill))}`);
        // g.endFill();
        g.lineStyle({
          width: Constants.defaultLineWidth, 
          color: PixiUtils.string2hex(d.fill),
          join: 'round',
          cap: 'square',
        });
        g.moveTo(currentX, currentY);
        previousName = currentName;
      }
      if ((currentX !== previousX) || (currentY !== previousY)) {
        g.lineTo(currentX, currentY);
        previousX = currentX;
        previousY = currentY;
      }
    });

    const gAsImgEnc = app.renderer.plugins.extract.canvas(g, new Rectangle(0, 0, this.state.hcRawDimension * this.state.hcScale, this.state.hcRawDimension * this.state.hcScale)).toDataURL('image/png')
    
    // console.log(`gAsImgEnc ${this.state.hcRawDimension * this.state.hcScale} | ${gAsImgEnc}`);

    await this.state.database.hilbertCurves.update(this.props.storageKey, {
      lineEnc: gAsImgEnc,
    })
  }

  updateScale = () => {
    // console.log(`HilbertCurveStage - updateScale - ${JSON.stringify(this.props.dimensions)}`);

    const constrainedDimension = (this.props.dimensions.width > this.props.dimensions.height) ? this.props.dimensions.height : this.props.dimensions.width;
    const newHcScale = constrainedDimension / this.state.hcRawDimension;
    const newHcPadding = {
      left: parseInt(newHcScale + this.props.dimensions.width - (this.state.hcRawDimension * newHcScale)),
      top: parseInt(newHcScale + this.props.dimensions.height - (this.state.hcRawDimension * newHcScale)),
    };

    // console.log(`${JSON.stringify(newHcPadding)}`);

    this.setState({
      hcScale: newHcScale,
      hcPadding: newHcPadding,
    });
  }
  
  render() {
    console.log(`HilbertCurveState - render`);
    // console.log(`HilbertCurveState - dimensions ${JSON.stringify(this.props.dimensions)}`);
    return (
      <div key={this.state.hcKey} ref={this.hilbertCurveRef} className="hc-parent" id="hc-parent">
        <div className="hc-canvas" id="hc-canvas">
          <div className="hc-canvas-container">
            <div className="hc-canvas-container-center">
              <Stage 
                width={this.props.dimensions.width} 
                height={this.props.dimensions.height}
                raf={true}
                renderOnComponentChange={false}
                options={{ 
                  // backgroundAlpha: 1,
                  backgroundColor: 0xffffff,
                }}>                    
                <HilbertCurveViewport
                  screenWidth={this.props.dimensions.width} 
                  screenHeight={this.props.dimensions.height}
                  worldWidth={Math.pow(2, this.props.settings.sampleOrder)}
                  worldHeight={Math.pow(2, this.props.settings.sampleOrder)}
                  scaleRange={this.state.hcScale}
                  >
                  <Container
                    scale={1}
                    position={[ 
                      (-this.props.dimensions.width + this.state.hcPadding.left) / 2, 
                      (-this.props.dimensions.height + this.state.hcPadding.top) / 2 
                    ]}
                    >
                    {
                    (this.props.lineEnc)
                    ? 
                    <AppConsumer>
                      {
                      (app) => {
                        console.log(`rendering from Sprite`);
                        return (
                          <Sprite
                            image={this.props.lineEnc}
                          />
                        );
                      }
                        
                      }
                    </AppConsumer>
                    :
                    <AppConsumer>
                      {
                      (app) => { 
                        console.log(`rendering from Graphics`);
                        return (
                          <Graphics
                            draw={debounce((g) => {
                              if (g) this.drawGraphics(g, app);
                            }, Constants.updateHcGraphicsRefreshTime)}
                          />
                        );
                      }

                      }
                    </AppConsumer>
                    }
                  </Container>
                </HilbertCurveViewport>
              </Stage>
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
                <span className="hc-debug-info-label">Coords array length:</span> <span className="hc-debug-info-value">{this.state.nCSamples}</span>
              </div>
            </div>
          </div>
        :
          <div />
        }
      </div>
    )
  }
};
  
export default HilbertCurveStage;