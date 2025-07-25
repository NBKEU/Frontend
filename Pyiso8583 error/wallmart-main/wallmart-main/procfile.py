# iso8583_crypto.py
from crypto_utils import send_token
from config import get_next_wallet


def process_crypto_payout(amount, payout_type, merchant_wallet, currency):
    """
    Handles real blockchain payouts to merchant.
    payout_type = "ERC20" or "TRC20"
    merchant_wallet = optional override (backend default wallet otherwise)
    """
    token = currency.upper()  # Should be USDT or USDC
    network = payout_type.upper()  # ERC20 or TRC20

    if not token in ["USDT", "USDC"]:
        raise ValueError("Unsupported token: only USDT or USDC allowed")

    if not network in ["ERC20", "TRC20"]:
        raise ValueError("Unsupported network: ERC20 or TRC20 expected")

    # Use backend-managed wallet if no manual override
    recipient = merchant_wallet or get_next_wallet(token, network)

    if not recipient:
        raise ValueError("No valid recipient wallet found for payout")

    # Send on chain
    tx_hash = send_token(token=token, network=network, to_address=recipient, amount=float(amount))

    return tx_hash
