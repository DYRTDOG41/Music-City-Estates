# Music City Estates — Tezos Production Rollout

## Architecture

Music City uses two separate FA2 contracts.

### Certified Record credential

The Certified Record contract is a non-transferable NFT credential. Its purpose is provenance, not speculation.

A token represents one finalized Record Passport and should reference:

- Record Passport ID
- master SHA-256
- Record Passport metadata SHA-256
- split agreement SHA-256
- artist and contributor credits
- rights statement
- AI-assistance disclosure
- Music City craft/quality metadata
- IPFS metadata URI

The SmartPy FA2 transfer policy is `NoTransfer`, so the credential cannot be sold or transferred after minting.

### Collectibles and media editions

The collectible contract is transferable and is intended for:

- official video editions
- limited digital vinyl
- plaques
- artist cosmetics
- studio assets
- event memorabilia
- fan collectibles

Every media edition should include the parent Record Passport ID in its token metadata so a wallet asset can be traced back to the underlying certified master.

## Network strategy

The browser prototype uses Shadownet and Tezos' public tutorial mint contract only for proof-of-concept transactions.

Production rollout:

1. Compile and test both Music City SmartPy contracts.
2. Configure a Music City-controlled administrator or multisig.
3. Publish TZIP-16 contract metadata.
4. Publish TZIP-21 token/media metadata and audio/video files through IPFS.
5. Originate both contracts on Shadownet.
6. Update `music_city_tezos.js` to use the Music City test contract addresses.
7. Test Kukai/Tezos wallet connection, minting, wallet display, and video editions.
8. Audit the contracts and certification flow.
9. Originate approved contracts on Tezos Mainnet.
10. Only Mainnet mints from the approved Certified Record contract receive the final `Music City Certified` status.

## Wallet policy

Music City never asks for or stores seed phrases or private keys. Wallets sign transactions directly.

The frontend should continue using the Tezos wallet connection standard through Taquito/octez.connect so players can use supported Tezos wallets without Music City becoming a custodian.

## Media storage

Large media should not be stored directly in Tezos contract storage.

Audio, video, thumbnails, and rich TZIP-21 JSON should be pinned to IPFS. The Tezos token stores the content-addressed URI and cryptographic provenance fields.

## Rights boundary

Owning a Music City NFT does not automatically transfer:

- copyright
- publishing ownership
- master ownership
- royalty participation
- songwriter rights

Those rights remain governed by the approved contributor agreements and split documents referenced by the Record Passport.


## Continuous contract validation

Every pull request that changes `contracts/**` runs the `Tezos Contract Validation`
GitHub Actions workflow. The workflow installs the pinned stable SmartPy toolchain,
runs both SmartPy test scenarios, compiles both contracts to Michelson, verifies
that contract and storage artifacts were generated, and uploads those compiled
files for review.

A contract change is not considered ready for Shadownet origination until this
workflow passes.
