//! Integer-only port of the trained Asolaria L2 ContrastiveGNN (contrastive_gnn.py, behcs-256
//! services/gnn-sidecar/models) with the run-1 checkpoint `contrastive_model.pt`.
//!
//! Hot lane: integers only, no Python, torch, JSON or HTTP. [`model`] runs `ContrastiveGNN.forward`
//! in eval mode with the fallback `GCNConv` of contrastive_gnn.py:17-23, the layout the checkpoint's
//! keys and module paths record; [`weights`] holds the checkpoint as Q24 integers.
#![forbid(unsafe_code)]

pub mod model;
pub mod weights;

pub use model::{
    anomaly_probabilities, edge_output, edge_outputs, EdgeOutput, ModelError, FRAC_BITS, HIDDEN,
    NODE_FEATURES, PROJECTION,
};
