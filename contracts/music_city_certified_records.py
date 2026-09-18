import smartpy as sp
from smartpy.templates import fa2_lib as fa2

# Music City Estates — Certified Record credential contract.
#
# Policy:
# - FA2-compatible NFT credential.
# - Only the Music City administrator can mint.
# - Certified Record credentials cannot be transferred.
# - Token metadata carries the Record Passport and provenance pointers.
#
# This file includes a SmartPy scenario so running:
#   python contracts/music_city_certified_records.py
# both tests and compiles the contract to Michelson.

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
            main.OnchainviewBalanceOf.__init__(self)
            main.MintNft.__init__(self)

            main.Nft.__init__(
                self,
                contract_metadata,
                ledger,
                token_metadata,
            )

            # NoTransfer must be initialized after the NFT base and before Admin.
            main.NoTransfer.__init__(self)
            main.Admin.__init__(self, admin_address)


@sp.add_test()
def test():
    scenario = sp.test_scenario(
        "MusicCityCertifiedRecords",
        music_city_certified_records,
    )

    admin = sp.test_account("Music City Admin")
    artist = sp.test_account("Artist")
    stranger = sp.test_account("Unauthorized Minter")

    contract = music_city_certified_records.MusicCityCertifiedRecords(
        admin.address,
        sp.big_map(),
        {},
        [],
    )
    scenario += contract

    record_metadata = fa2.make_metadata(
        name="Music City Certified Record",
        decimals=0,
        symbol="MCE",
    )

    scenario.h2("Only the Music City administrator can mint")
    contract.mint(
        [
            sp.record(
                metadata=record_metadata,
                to_=artist.address,
            )
        ],
        _sender=stranger,
        _valid=False,
        _exception="FA2_NOT_ADMIN",
    )

    scenario.h2("Administrator mints the credential to the artist")
    contract.mint(
        [
            sp.record(
                metadata=record_metadata,
                to_=artist.address,
            )
        ],
        _sender=admin,
    )
    scenario.verify(contract.data.ledger[0] == artist.address)

    scenario.h2("Certified Record credentials cannot be transferred")
    contract.transfer(
        [
            sp.record(
                from_=artist.address,
                txs=[
                    sp.record(
                        to_=stranger.address,
                        token_id=0,
                        amount=1,
                    )
                ],
            )
        ],
        _sender=artist,
        _valid=False,
        _exception="FA2_TX_DENIED",
    )

    scenario.verify(contract.data.ledger[0] == artist.address)
