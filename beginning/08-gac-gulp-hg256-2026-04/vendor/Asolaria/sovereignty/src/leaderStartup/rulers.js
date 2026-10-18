const { slugify } = require("./normalize");

function buildRulerProfiles(rulers, machineContext, outputDir) {
  return rulers.map((ruler, index) => ({
    ruler_id: ruler.id,
    ruler_title: ruler.title,
    pid: ruler.pid,
    omni_profile_id: `${slugify(ruler.omniProfile)}::${machineContext.machineProfileId}`,
    authority_rank: ruler.authorityRank,
    trust_class: ruler.trustClass,
    host: machineContext.host,
    device_id: machineContext.deviceId,
    active_ruler: index === 0 ? "yes" : "no",
    source_of_truth: "owner-gated host execution root",
    profile_path: `${outputDir}\\ruler-operator-profiles.json`
  }));
}

module.exports = {
  buildRulerProfiles
};
