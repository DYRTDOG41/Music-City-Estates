import smartpy as sp
from smartpy.templates import fa2_lib as fa2

# Music City Estates — Certified Record credential contract blueprint.
#
# Design goals:
# - FA2-compatible NFT credential.
# - Only the Music City administrator can mint.
# - Certified Record credentials cannot be transferred.
# - Token metadata carries the Record Passport and provenance pointers.
#
# Before production deployment:
# 1. Compile/test this contract in the current SmartPy environment.
# 2. Set Music City's multisig/admin address.
# 3. Publish contract metadata (TZIP-16) and token metadata (TZIP-21) to IPFS.
# 4. Deploy to Tezos testnet first, audit, then originate on Mainnet.

main = fa2.main


@sp.module
def music_city_certified_records():
    import main

    class MusicCityCertifiedRecords(
        main.Admin,
        main.NoTransfer,
        main.Nft,
        main.MintNft,
        main.OnchainviewBalanceOf,
    ):
        def __init__(
            self,
            admin_address,
            contract_metadata,
            ledger,
            token_metadata,
        ):
            # Optional/view mixins first.
            main.OnchainviewBalanceOf.__init__(self)
            main.MintNft.__init__(self)

            # NFT base.
            main.Nft.__init__(
                self,
                contract_metadata,
                ledger,
                token_metadata,
            )

            # Credential policy: the certificate cannot be transferred.
            main.NoTransfer.__init__(self)

            # Minting authority belongs to Music City administration.
            main.Admin.__init__(self, admin_address)
