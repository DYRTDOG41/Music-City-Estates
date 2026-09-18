import smartpy as sp
from smartpy.templates import fa2_lib as fa2

# Music City Estates — transferable collectible / media-edition contract.
#
# Intended for:
# - official video editions
# - limited digital vinyl
# - plaques
# - artist cosmetics / rare game assets
# - event and venue memorabilia
#
# This contract deliberately stays separate from the non-transferable
# Certified Record credential contract.

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


@sp.add_test()
def test():
    scenario = sp.test_scenario(
        "MusicCityCollectibles",
        music_city_collectibles,
    )

    admin = sp.test_account("Music City Admin")
    artist = sp.test_account("Artist")
    fan = sp.test_account("Fan")
    stranger = sp.test_account("Unauthorized Minter")

    contract = music_city_collectibles.MusicCityCollectibles(
        admin.address,
        sp.big_map(),
        {},
        [],
    )
    scenario += contract

    video_metadata = fa2.make_metadata(
        name="Official Music City Video Edition",
        decimals=0,
        symbol="MCEV",
    )

    scenario.h2("Only the administrator can mint official editions")
    contract.mint(
        [
            sp.record(
                metadata=video_metadata,
                to_=artist.address,
            )
        ],
        _sender=stranger,
        _valid=False,
        _exception="FA2_NOT_ADMIN",
    )

    scenario.h2("Administrator mints the video edition")
    contract.mint(
        [
            sp.record(
                metadata=video_metadata,
                to_=artist.address,
            )
        ],
        _sender=admin,
    )
    scenario.verify(contract.data.ledger[0] == artist.address)

    scenario.h2("Artist can transfer a collectible edition to a fan")
    contract.transfer(
        [
            sp.record(
                from_=artist.address,
                txs=[
                    sp.record(
                        to_=fan.address,
                        token_id=0,
                        amount=1,
                    )
                ],
            )
        ],
        _sender=artist,
    )
    scenario.verify(contract.data.ledger[0] == fan.address)
