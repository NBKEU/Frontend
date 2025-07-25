# config.py — Round-robin wallet rotation setup

from itertools import cycle

wallets = {
    "USDT": {
        "ERC20": cycle([
            "0xWallet1ERC20",
            "0xWallet2ERC20",
            "0xWallet3ERC20",
            "0xWallet4ERC20",
            "0xWallet5ERC20"
        ]),
        "TRC20": cycle([
            "TGWallet1TRC20",
            "TGWallet2TRC20",
            "TGWallet3TRC20",
            "TGWallet4TRC20",
            "TGWallet5TRC20"
        ])
    },
    "USDC": {
        "ERC20": cycle([
            "0xWallet1USDC",
            "0xWallet2USDC",
            "0xWallet3USDC",
            "0xWallet4USDC",
            "0xWallet5USDC"
        ]),
        "TRC20": cycle([
            "TGWallet1USDC",
            "TGWallet2USDC",
            "TGWallet3USDC",
            "TGWallet4USDC",
            "TGWallet5USDC"
        ])
    }
}

def get_next_wallet(currency, payout_type):
    return next(wallets[currency][payout_type])
