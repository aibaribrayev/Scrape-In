import * as React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useState } from 'react';
import { useEffect } from 'react';
import { render } from 'react-dom';
import './popup.css';
import axios from 'axios';
import IconButton from '@mui/joy/IconButton';
import CloseRounded from '@mui/icons-material/CloseRounded';
import Link from '@mui/material/Link';
import fileDownload from 'js-file-download';

let messageQueue = [];
const getDownload = async () => {
  await axios({
    url: 'http://localhost:8080/comments',
    method: 'GET',
    responseType: 'blob',
  })
    .then((response) => {
      fileDownload(response.data, 'result.csv');
    })
    .catch((er) => {
      console.log(er);
    });
};
const App: React.FC<{}> = () => {
  const [linksArr, setLinksArr] = useState(messageQueue);
  const [checked, setChecked] = useState(
    new Array(messageQueue.length).fill(false)
  );

  const handleCheck = (event) => {
    var updatedList = [...checked];
    if (event.target.checked) {
      updatedList[event.target.value] = true;
    } else {
      updatedList[event.target.value] = false;
    }
    console.log(updatedList);

    setChecked(updatedList);
  };

  let clickedButtons = new Map([
    ['reactions', false],
    ['comments', false],
    ['both', false],
  ]);

  useEffect(() => {
    chrome.storage.local.get({ links: messageQueue }, function (result) {
      messageQueue = result.links;
      setLinksArr(messageQueue);
      clickedButtons = new Map([
        ['reactions', false],
        ['comments', false],
        ['both', false],
      ]);
    });
  }, []);

  const post = async (type) => {
    console.log(clickedButtons);
    if (!clickedButtons.get(type)) {
      chrome.storage.local.set(
        {
          post: {
            url: messageQueue,
            type: `${type}`,
            checked: checked,
          },
        },
        function () {
          console.log('blob changed');
        }
      );
      clickedButtons.set(type, true);
      alert(
        'It may take some time to extract the data. The CSV table will be downloaded once the process is finished'
      );
      console.log('say something background');
    }
  };
  const remove = (index) => {
    console.log(messageQueue);
    messageQueue.splice(index, 1);
    chrome.storage.local.set({ links: messageQueue }, function () {
      console.log(messageQueue);
    });
    setLinksArr([...messageQueue]);
  };

  return (
    <div className="container">
      <div className="header-wrapper">
        <div>
          <img src="icon.png" />
        </div>
        <div className="title">Extract data from LinkedIn</div>
      </div>

      <ul className="selected_posts">
        {linksArr.map((el, i) => (
          <li id="list-item">
            <Link component="button" variant="body1" key={el}>
              <form action={el} method="get" target="_blank">
                <Link component="button" variant="body1" key={el}>
                  post #{i + 1}
                </Link>
              </form>
            </Link>
            <div className="options">
              <div className="show-jobs">
                <FormControlLabel
                  control={
                    <Checkbox
                      value={i}
                      onChange={handleCheck}
                      // checked={checked[i]}
                    />
                  }
                  label="add occupation"
                />
              </div>
              <IconButton
                size="sm"
                variant="plain"
                color="neutral"
                onMouseDown={(event) => {
                  // don't open the popup when clicking on this button
                  event.stopPropagation();
                }}
                onClick={() => {
                  remove(i);
                }}
              >
                <CloseRounded />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>

      <div className="send-list">
        <Stack spacing={1} direction="row">
          <Button
            onClick={() => {
              post('reactions');
            }}
          >
            Reactions
          </Button>
          <Button
            onClick={() => {
              post('comments');
            }}
          >
            Comments
          </Button>
          <Button
            onClick={() => {
              post('both');
            }}
          >
            Export both
          </Button>
        </Stack>
      </div>
      <h5 id="note">
        exporting occupation data may slow down the process slow down the
        process
      </h5>
    </div>
  );
};

const root = document.createElement('div');
document.body.appendChild(root);
render(<App />, root);
