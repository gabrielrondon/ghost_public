export const idlFactory = ({ IDL }) => {
  const Token = IDL.Record({ 'symbol' : IDL.Text, 'balance' : IDL.Text });
  const WalletInfo = IDL.Record({
    'address' : IDL.Text,
    'balance' : IDL.Text,
    'tokens' : IDL.Vec(Token),
  });
  const ZKProof = IDL.Record({
    'proof' : IDL.Vec(IDL.Nat8),
    'publicInputs' : IDL.Vec(IDL.Text),
    'reference' : IDL.Text,
  });
  return IDL.Service({
    'getWalletInfo' : IDL.Func([IDL.Text], [WalletInfo], ['query']),
    'generateProof' : IDL.Func([IDL.Text, IDL.Text], [ZKProof], []),
    'verifyProof' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
  });
};
