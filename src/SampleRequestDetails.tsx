import React from "react";
import { SampleDetails } from "./Models";

export const SampleRequestDetails = ({
  sampleDetails
}: {
  sampleDetails: SampleDetails;
}) => (
  <>
    <h3>Sample request details</h3>
    <div>
      <div>Label: {sampleDetails.label}</div>
      <div>Length (ms): {sampleDetails.length}</div>
      <div>Sensor: {sampleDetails.sensor}</div>
      <div>Interval: {sampleDetails.interval}</div>
    </div>
  </>
);
