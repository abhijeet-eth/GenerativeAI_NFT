import "./App.css";
import { useState, useEffect, useCallback } from "react";
import { create as ipfsHttpClient } from "ipfs-http-client";
import AITokenABI from "./AITokenABI.json";
import "bootstrap/dist/css/bootstrap.min.css";
// import Replicate from "replicate";
import { ethers } from "ethers";
const Replicate = require("replicate");

// const ethers = require("ethers");

// if env is not working then directly put the Infura Id and Key
// taken from Infura
// const projectId = process.env.REACT_APP_PROJECT_ID;
// const projectSecretKey = process.env.REACT_APP_PROJECT_KEY;

const projectId = "2JwnITRYL8qxpSsA0lp5yXRGk8m";
const projectSecretKey = "ad81c7eb6e7578e078eaed4994f5f2f6";
const authorization = "Basic " + btoa(projectId + ":" + projectSecretKey);

function App() {
  let AITokenContractAddress = "0xBF73112cFDFF73C349597d85C6317E72C790181A";

  const [uploadedImages, setUploadedImages] = useState([]);

  let [blockchainProvider, setBlockchainProvider] = useState(undefined);
  let [metamask, setMetamask] = useState(undefined);
  let [metamaskNetwork, setMetamaskNetwork] = useState(undefined);
  let [metamaskSigner, setMetamaskSigner] = useState(undefined);
  const [networkId, setNetworkId] = useState(undefined);
  const [loggedInAccount, setAccounts] = useState(undefined);
  const [etherBalance, setEtherBalance] = useState(undefined);
  const [isError, setError] = useState(false);

  const [AITokenContract, setReadAItokenContract] = useState();
  const [writeAITokenContract, setWriteAITokenContract] = useState();

  const [description, setDescription] = useState();
  const [aiResult, setAiResult] = useState([]);
  const [address, setAddress] = useState();
  const [imageUri, setImageUri] = useState();

  const connect = async () => {
    try {
      let provider, network, metamaskProvider, signer, accounts;

      if (typeof window.ethereum !== "undefined") {
        // Connect to RPC
        console.log("loadNetwork");
        try {
          //console.log("acc", acc);
          //window.ethereum.enable();
          //await handleAccountsChanged();
          accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          await handleAccountsChanged(accounts);
        } catch (err) {
          if (err.code === 4001) {
            // EIP-1193 userRejectedRequest error
            // If this happens, the user rejected the connection request.
            console.log("Please connect to MetaMask.");
          } else {
            console.error(err);
          }
        }
        provider = new ethers.providers.JsonRpcProvider(
          `https://goerli.infura.io/v3/c811f30d8ce746e5a9f6eb173940e98a`
        );
        // const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545")
        setBlockchainProvider(provider);
        network = await provider.getNetwork();
        console.log(network.chainId);
        setNetworkId(network.chainId);

        // Connect to Metamask
        metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
        setMetamask(metamaskProvider);

        signer = await metamaskProvider.getSigner(accounts[0]);
        setMetamaskSigner(signer);

        metamaskNetwork = await metamaskProvider.getNetwork();
        setMetamaskNetwork(metamaskNetwork.chainId);

        console.log(network);

        if (network.chainId !== metamaskNetwork.chainId) {
          alert("Your Metamask wallet is not connected to " + network.name);

          setError("Metamask not connected to RPC network");
        }

        let tempAITokenContract = new ethers.Contract(
          AITokenContractAddress,
          AITokenABI,
          provider
        );
        setReadAItokenContract(tempAITokenContract); //AITokenContract
        let tempAITokenContract2 = new ethers.Contract(
          AITokenContractAddress,
          AITokenABI,
          signer
        );
        setWriteAITokenContract(tempAITokenContract2); //writeAITokenContract
      } else setError("Could not connect to any blockchain!!");

      return {
        provider,
        metamaskProvider,
        signer,
        network: network.chainId,
      };
    } catch (e) {
      console.error(e);
      setError(e);
    }
  };
  const handleAccountsChanged = async (accounts) => {
    if (typeof accounts !== "string" || accounts.length < 1) {
      accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
    }
    console.log("t1", accounts);
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      alert("Please connect to MetaMask.");
    } else if (accounts[0] !== loggedInAccount) {
      setAccounts(accounts[0]);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { provider, metamaskProvider, signer, network } = await connect();

      const accounts = await metamaskProvider.listAccounts();
      console.log(accounts[0]);
      setAccounts(accounts[0]);

      if (typeof accounts[0] == "string") {
        setEtherBalance(
          ethers.utils.formatEther(
            Number(await metamaskProvider.getBalance(accounts[0])).toString()
          )
        );
      }
    };

    init();

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    window.ethereum.on("chainChanged", function (networkId) {
      // Time to reload your interface with the new networkId
      //window.location.reload();
      unsetStates();
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (
        typeof metamask == "object" &&
        typeof metamask.getBalance == "function" &&
        typeof loggedInAccount == "string"
      ) {
        setEtherBalance(
          ethers.utils.formatEther(
            Number(await metamask.getBalance(loggedInAccount)).toString()
          )
        );
      }
    })();
  }, [loggedInAccount]);

  const unsetStates = useCallback(() => {
    setBlockchainProvider(undefined);
    setMetamask(undefined);
    setMetamaskNetwork(undefined);
    setMetamaskSigner(undefined);
    setNetworkId(undefined);
    setAccounts(undefined);
    setEtherBalance(undefined);
  }, []);

  const isReady = useCallback(() => {
    return (
      typeof blockchainProvider !== "undefined" &&
      typeof metamask !== "undefined" &&
      typeof metamaskNetwork !== "undefined" &&
      typeof metamaskSigner !== "undefined" &&
      typeof networkId !== "undefined" &&
      typeof loggedInAccount !== "undefined"
    );
  }, [
    blockchainProvider,
    metamask,
    metamaskNetwork,
    metamaskSigner,
    networkId,
    loggedInAccount,
  ]);

  const ipfs = ipfsHttpClient({
    url: "https://ipfs.infura.io:5001/api/v0",
    headers: {
      authorization,
    },
  });

  const generateAIImage = async (description) => {
    //using api of Generative Text-to-Image AI: Replicate

    const replicate = new Replicate({
      // auth: process.env.REPLICATE_API_TOKEN,
      auth: "r8_7YshpZiSUI90Yw1RNJ3uS9hPfTzDKHp0qabTg",
    });
  //   const output = await replicate.run(
  //     "laion-ai/erlich:92fa143ccefeed01534d5d6648bd47796ef06847a6bc55c0e5c5b6975f2dcdfb",
  //     {
  //       input: {
  //         prompt: description,
  //       },
  //     }
  //   );
  //   console.log("ai output ==>", output);
  //   setAiResult(output);

  const prediction = await replicate.predictions.create({
    version: "92fa143ccefeed01534d5d6648bd47796ef06847a6bc55c0e5c5b6975f2dcdfb",
    input: {
      prompt: description,
    },
    webhook: "http://localhost:3000/",
    webhook_events_filter: ["completed"]
  });

  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    const form = event.target;
    const files = form[0].value;

    if (!files || files.length === 0) {
      return alert("No text selected");
    }

    const file = files[0];
    // upload files
    const result = await ipfs.add(file);
    const completeImagePath = `https://infura-ipfs.io/ipfs/${result.path}`;

    var metaData = {
      address: event.target[0].value,
      name: description,
      image: event.target[1].value,
    };

    const metaDataUri = JSON.stringify(metaData);
    console.log("metaDatUri ==> ", metaDataUri);

    const result2 = await ipfs.add(metaDataUri);
    // console.log("result2 ==>", result2)
    const completeMetadataPath = `https://infura-ipfs.io/ipfs/${result2.path}`;
    console.log("Metadata URI ==>", completeMetadataPath);

    await writeAITokenContract.safeMint(address, completeMetadataPath);

    setUploadedImages([
      ...uploadedImages,
      {
        cid: result.cid,
        path: result.path,
      },
    ]);

    form.reset();
  };

  return (
    <div className="container">
      <nav className="navbar navbar-light bg-light">
        <a className="navbar-brand" href="#">
          Navbar
        </a>
      </nav>
      <h1>Generative AI X Blockchain </h1>
      <div class="row">
        <div class="col-sm">
          <h5 className="functionName"> Generate AI Images </h5>

          <form className="input" onSubmit={generateAIImage}>
            <input
              id="eventID"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              type="text"
              placeholder="Text"
            />
            <button
              type="button"
              className="btn btn-warning"
              onClick={() => generateAIImage(description)}
            >
              {" "}
              Generate AI Images
            </button>
          </form>
          {aiResult.length > 0 ? (
            <ui>
              <li>{aiResult[0]}</li>
              <li>{aiResult[1]}</li>
              <li>{aiResult[2]}</li>
              <li>{aiResult[3]}</li>
            </ui>
          ) : null}
          <br />

          <h5 className="admin"> Mint AI NFT </h5>
          <div class="card" style={{ width: "18rem;" }}>
            <div class="card-body">
              <div className="app">
                <div className="app__container">
                  {ipfs ? (
                    <div className="container">
                      <h5 className="functionName"> Mint AI Token</h5>
                      <form class="form" onSubmit={onSubmitHandler}>
                        {/* <label for="file-upload" class="custom-file-upload">
                                                    Select File
                                                </label>
                                                <input id="file-upload" type="file" name="file" />
                                                <br /> <br /> */}
                        <input
                          id="setAddr"
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          type="text"
                          placeholder="Address"
                        />
                        <input
                          id="imageUri"
                          value={imageUri}
                          onChange={(event) => setImageUri(event.target.value)}
                          type="text"
                          placeholder="Image URI"
                        />
                        <button className="button" type="submit">
                          Mint
                        </button>
                      </form>
                    </div>
                  ) : null}
                  <div className="data">
                    {uploadedImages.map((image, index) => (
                      <>
                        <img
                          className="image"
                          alt={`Uploaded #${index + 1}`}
                          src={"https://infura-ipfs.io/ipfs/" + image.path}
                          style={{ maxWidth: "400px", margin: "15px" }}
                          key={image.cid.toString() + index}
                        />
                        {/* <h4>Link to IPFS:</h4> */}
                        {/* <a href={"https://infura-ipfs.io/ipfs/" + image.path}>
                                                    <h3>{"https://infura-ipfs.io/ipfs/" + image.path}</h3> */}
                        {/* </a> */}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
