import './contentScript.css';

//Getting data from Server
const SendGetRequest = async () => {
  await fetch('https://scrape-in.herokuapp.com/', {
    method: 'GET',
  })
    .then((res) => {
      console.log('sent get request to server');
      return res.blob();
    })
    .then((data) => {
      console.log('data converted');
      var a = document.createElement('a');
      a.href = window.URL.createObjectURL(data);
      a.download = 'result.csv';
      a.click();
    });
};

//Sending posts to server
const SendPostRequest = async (data) => {
  console.log(data);
  await fetch('https://scrapin-backend.herokuapp.com', {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(() => {
      console.log('posts sent to server');
      SendGetRequest();
    })
    .catch((err) => {
      console.log(err);
      console.log(
        'Sorry, something went wrong! please reopen the popup menu and try again'
      );
    });
};

//listen to local storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    if (key == 'post') {
      SendPostRequest(newValue);
    }
  }
});

const openDropdown = (element) => {
  (
    element.querySelector(
      '.feed-shared-control-menu__trigger'
    ) as HTMLButtonElement
  ).click();

  setTimeout(() => {
    try {
      let text = Array.from(document.querySelectorAll('h5'));
      for (let i = 0; i < text.length; i++) {
        if (text[i].innerHTML.includes('Copy link to post')) {
          (text[i] as HTMLHeadingElement).click();
        }
      }
    } catch (e) {}
  }, 1000);
};

setInterval(function () {
  let text = document.createElement('span');
  text.textContent = 'Add to list';
  text.id = 'btnText';

  let btn = document.createElement('a');
  // btn.id = 'search-mm-btn';
  btn.type = 'button';
  btn.className =
    'social-actions-button send-privately-button artdeco-button artdeco-button--4 artdeco-button--tertiary flex-wrap artdeco-button--muted send-privately-button';
  btn.appendChild(text);
  //  ADDING BUTTON TO SOCIALS
  try {
    let posts = Array.from(document.querySelectorAll('.feed-shared-update-v2'));
    for (let i = 0; i < posts.length; i++) {
      let socials, count;
      try {
        socials = posts[i].querySelector('.feed-shared-social-action-bar');
      } catch (e) {}
      try {
        count = socials.childElementCount;
      } catch (e) {}
      if (count == 4) {
        socials.appendChild(btn.cloneNode(true));
        socials.lastChild.addEventListener('click', (e: Event) =>
          openDropdown(posts[i])
        );
      }
    }
  } catch (e) {
    console.log('error in adding button to a socials');
    console.log(e);
  }
  // changing Link copied to clipboard and GETTING LINK TO POST
  try {
    let confirmEl = document.querySelector('.artdeco-toast-item__message');
    let link = document
      .querySelector('.artdeco-toast-item__cta')
      .getAttribute('href');

    let confirmationText = confirmEl.children[0].innerHTML;

    if (confirmationText.trim() == 'Link copied to clipboard.') {
      confirmEl.children[0].innerHTML = confirmEl.children[0].innerHTML.replace(
        'Link copied to clipboard.',
        'The post is ready to be scraped. Just choose options on the popup menu of the extension.'
      );
      let newarr = [];

      chrome.storage.local.get({ links: newarr }, function (result) {
        let newlinks = new Set(result.links);
        console.log(result.links);
        newlinks.add(link);
        chrome.storage.local.set({ links: [...newlinks] }, function () {
          console.log(newlinks);
        });
      });
    }
  } catch (e) {}
}, 500);
