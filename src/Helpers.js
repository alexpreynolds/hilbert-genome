import * as d3 from "d3";
import d3Hilbert from "d3-hilbert";

import * as Helpers from "./Helpers.js"
import * as Constants from "./Constants.js"

export const storageKeyByParams = ({
  markType,
  sampleOrder,
} = {}) => 
{
  return `hilbertGenome|markType__${markType}|viewOrder__${sampleOrder}`;
}

export const makeChromosomeSamples = ({
  baseOrder, 
  viewOrder, 
  totalSamples, 
  chroms, 
  chromsSize} = {}) => 
{
  viewOrder = (viewOrder >= Constants.sampleOrderStart && viewOrder <= Constants.sampleOrderStop) ? viewOrder : Constants.defaultSampleOrder;
  const baseToView = (i) => Math.floor(i / Math.pow(4, baseOrder - viewOrder));
  return chroms.flatMap((d) => {
    const UCSCchromosomeName = `chr${d.name}`;
    let points = makePointsSample({
      order: viewOrder,
      num: Math.floor((totalSamples * d.size) / chromsSize),
      start: baseToView(d.offset),
      end: baseToView(d.offset + d.size),
      chrom: UCSCchromosomeName,
      chromSuffix: d.name,
    }).map((p) => {
      // console.log(`p ${JSON.stringify(p)}`);
      return {
        ...p,
        name: d.name
      };
    });
    // console.log(`points[0] ${JSON.stringify(points[0])}`);
    return points;
  });
}

export const makePointsSample = ({
  order,       // order of the Hilbert space we want to sample
  num,         // number of points we want to return
  start = 0,   // first point in linear space
  end = num,   // last point in linear space
  chrom,       // chromosome name
  chromSuffix, // chromosome name suffix
} = {}) => 
{
  const hilbert = d3Hilbert().order(order);
  // const states = 18;
  const s = d3.scaleLinear().domain([0, num]).range([start, end]);
  return d3.range(num).map((i) => {
    // const p = Math.floor(i / num * Math.pow(4, order));
    const p = Math.floor(s(i));
    const xy = hilbert.getXyAtVal(p);
    const state = 0; // epilogosData[chrom][i]; // Math.floor(Math.random() * states);
    const fill = d3.schemeTableau10[Helpers.chromosomeSuffixToIndex()[chromSuffix] % 10]; // '#ff0000'; // stateMetadata[state][1];
    return { x: xy[0], y: xy[1], i, p, state, fill };
  });
}

export const chromosomes = (chroms) => {
  let offset = 0;
  return chroms.map(d => {
    let c = {
      ...d,
      offset: offset
    }
    offset += d.size; // + perChromosomeOffset
    // if(d.name == 8) offset += 36000000//1200000000
    return c;
  });
}

export const chromosomeSuffixToIndex = () => {
  const os = {};
  Constants.chromosomeMetadata.forEach((v, k) => { 
    os[v.name] = k;
  });
  return os;
}