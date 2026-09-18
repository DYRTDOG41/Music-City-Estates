import smartpy as sp
from smartpy.templates import fa2_lib as fa2

# Music City Estates — transferable collectible / media-edition contract blueprint.
#
# Intended for:
# - official video editions
# - limited digital vinyl
# - plaques
# - artist cosmetics / rare game assets
# - event and venue memorabilia
#
# Unlike the Certified Record credential contract, these NFTs use the
# normal transferable FA2 owner/operator policy.

main = fa2.main


@sp.module
def music_city_collectibles():
    import main

    class MusicCityCollectibles(
        main.Admin,
        main.Nft,
        main.MintNft,
        main.BurnNft,
        main.OnchainviewBalanceOf,
    ):
        def __init__(
            self,
            admin_address,
            contract_metadata,
            ledger,
            token_metadata,
        ):
            main.OnchainviewBalanceOf.__init__(self)
            main.BurnNft.__init__(self)
            main.MintNft.__init__(self)

            main.Nft.__init__(
                self,
                contract_metadata,
                ledger,
                token_metadata,
            )

            main.Admin.__init__(self, admin_address)
